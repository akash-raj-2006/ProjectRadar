import { analyzeFiles, scoreFindings, type Finding, type Scores } from "./repo-scan.server";

export type RemoteReport = {
  repo: string;
  url: string;
  description: string;
  stars: number;
  defaultBranch: string;
  scannedAt: string;
  filesScanned: number;
  filesInRepo: number;
  linesScanned: number;
  scores: Scores;
  passed: string[];
  findings: Finding[];
};

const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|php|css)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|vendor|\.next|coverage)\//;
const MAX_FILES = 30;
const MAX_BYTES = 150_000;

export function parseRepoRef(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const fromUrl = trimmed.match(/github\.com[/:]([^/]+)\/([^/?#]+)/i);
  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  const match = fromUrl ?? shorthand;
  if (!match?.[1] || !match[2]) return null;
  return { owner: match[1], repo: match[2] };
}

async function gh(path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ProjectRadar" },
  });
  if (response.status === 404) throw new Error("Repository not found. Check the URL and that it is public.");
  if (response.status === 403) throw new Error("GitHub rate limit reached. Please try again in a few minutes.");
  if (!response.ok) throw new Error(`GitHub request failed with status ${response.status}.`);
  return response.json() as Promise<unknown>;
}

export async function scanRemoteRepo(input: string): Promise<RemoteReport> {
  const ref = parseRepoRef(input);
  if (!ref) throw new Error("That does not look like a GitHub repository URL.");

  const meta = (await gh(`/repos/${ref.owner}/${ref.repo}`)) as {
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    default_branch: string;
  };

  const tree = (await gh(
    `/repos/${ref.owner}/${ref.repo}/git/trees/${meta.default_branch}?recursive=1`,
  )) as { tree?: Array<{ path: string; type: string; size?: number }> };

  const all = (tree.tree ?? []).filter((n) => n.type === "blob");
  const codePaths = all
    .filter((n) => CODE_FILE.test(n.path) && !SKIP.test(n.path) && (n.size ?? 0) < MAX_BYTES)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, MAX_FILES)
    .map((n) => n.path);

  const raw = async (path: string) => {
    const res = await fetch(
      `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${meta.default_branch}/${path}`,
      { headers: { "User-Agent": "ProjectRadar" } },
    );
    return res.ok ? res.text() : "";
  };

  const contents = await Promise.all(codePaths.map(async (p) => [p, await raw(p)] as const));
  const files = Object.fromEntries(contents.filter(([, text]) => text.length > 0));

  const analysis = analyzeFiles(files);
  const findings = [...analysis.findings];
  const passed = [...analysis.passed];

  const hasGitignore = all.some((n) => n.path === ".gitignore");
  const gitignore = hasGitignore ? await raw(".gitignore") : "";
  if (!/(^|\n)\.?env/i.test(gitignore)) {
    findings.push({
      id: "remote-gitignore-env",
      category: "security",
      severity: "high",
      title: "Environment files are not ignored by git",
      detail: "No .env entry in .gitignore — credentials could be committed.",
      file: ".gitignore",
    });
  } else {
    passed.push(".env files are excluded from version control");
  }

  const envCommitted = all.some((n) => /(^|\/)\.env($|\.)/i.test(n.path));
  if (envCommitted) {
    findings.push({
      id: "remote-env-committed",
      category: "security",
      severity: "high",
      title: "An .env file is committed to the repository",
      detail: "Remove it from git history and rotate any credentials it contained.",
    });
  }

  const readmePath = all.find((n) => /^readme(\.md)?$/i.test(n.path))?.path;
  const readme = readmePath ? await raw(readmePath) : "";
  if (readme.length < 400) {
    findings.push({
      id: "remote-readme",
      category: "quality",
      severity: "medium",
      title: "README is thin or missing",
      detail: "Document setup, features and tech stack for reviewers.",
      file: readmePath ?? "README.md",
    });
  } else {
    passed.push("README documents the project for reviewers");
  }

  const hasCi = all.some((n) => n.path.startsWith(".github/workflows/"));
  if (hasCi) passed.push("Continuous integration workflows are configured");
  else
    findings.push({
      id: "remote-ci",
      category: "quality",
      severity: "low",
      title: "No CI workflow found",
      detail: "Add a GitHub Actions workflow to run builds and checks on every push.",
    });

  const pkgNode = all.find((n) => n.path === "package.json");
  if (pkgNode) {
    try {
      const pkg = JSON.parse(await raw("package.json")) as { dependencies?: Record<string, string> };
      const deps = Object.keys(pkg.dependencies ?? {});
      const unused = deps.filter(
        (dep) => !analysis.importedPackages.has(dep) && !dep.startsWith("@types/"),
      );
      if (unused.length > 0 && codePaths.length >= deps.length) {
        findings.push({
          id: "remote-unused-deps",
          category: "efficiency",
          severity: "low",
          title: `${unused.length} dependency(ies) with no import in the scanned files`,
          detail: unused.slice(0, 12).join(", "),
          file: "package.json",
        });
      }
    } catch {
      /* unparseable package.json — skip dependency analysis */
    }
  }

  return {
    repo: meta.full_name,
    url: meta.html_url,
    description: meta.description ?? "No description provided.",
    stars: meta.stargazers_count,
    defaultBranch: meta.default_branch,
    scannedAt: new Date().toISOString(),
    filesScanned: analysis.filesScanned,
    filesInRepo: all.length,
    linesScanned: analysis.linesScanned,
    scores: scoreFindings(findings),
    passed,
    findings: findings.slice(0, 80),
  };
}
