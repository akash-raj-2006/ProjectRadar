/**
 * Static repo scanner. Runs server-side over the bundled project source.
 * No network access, no shell: the source text is embedded at build time.
 */

export type Finding = {
  id: string;
  category: "security" | "quality" | "efficiency";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
};

export type AuditReport = {
  scannedAt: string;
  filesScanned: number;
  linesScanned: number;
  scores: { security: number; quality: number; efficiency: number; overall: number };
  passed: string[];
  findings: Finding[];
};

const sources = import.meta.glob("../**/*.{ts,tsx,css}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const pkgRaw = import.meta.glob("../../package.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const gitignoreRaw = import.meta.glob("../../.gitignore", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const readmeRaw = import.meta.glob("../../README.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const clean = (path: string) => path.replace(/^\.\.\/\.\.\//, "").replace(/^\.\.\//, "src/");

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9]{20,}/, "OpenAI-style secret key literal"],
  [/AIza[0-9A-Za-z_-]{30,}/, "Google API key literal"],
  [/ghp_[A-Za-z0-9]{20,}/, "GitHub personal access token literal"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, "Hardcoded JWT literal"],
];

export function runAudit(): AuditReport {
  const findings: Finding[] = [];
  const passed: string[] = [];
  let linesScanned = 0;

  const entries = Object.entries(sources).filter(
    ([path]) => !path.includes("routeTree.gen") && !path.includes("/ui/"),
  );

  const importedPackages = new Set<string>();
  let consoleHits = 0;
  let secretHits = 0;
  let imgWithoutAlt = 0;
  let anyHits = 0;
  let clientEnvSecretHits = 0;
  const longFiles: string[] = [];

  for (const [path, code] of entries) {
    const file = clean(path);
    const lines = code.split("\n");
    linesScanned += lines.length;
    const isServer = /\.server\.ts$|\.functions\.ts$/.test(file);

    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(code)) {
        secretHits += 1;
        findings.push({
          id: `secret-${file}`,
          category: "security",
          severity: "high",
          title: "Possible hardcoded credential",
          detail: `${label} found in source. Move it to a server-side environment variable.`,
          file,
        });
      }
    }

    if (/import\.meta\.env\.VITE_[A-Z_]*(SECRET|PRIVATE|SERVICE_ROLE)/.test(code)) {
      clientEnvSecretHits += 1;
      findings.push({
        id: `client-secret-${file}`,
        category: "security",
        severity: "high",
        title: "Secret exposed to the browser",
        detail: "A secret-looking value is read through a client-visible VITE_ variable.",
        file,
      });
    }

    if (!isServer && /process\.env\./.test(code)) {
      findings.push({
        id: `env-client-${file}`,
        category: "security",
        severity: "medium",
        title: "Server environment read outside a server module",
        detail: "process.env should only be read inside server functions or *.server files.",
        file,
      });
    }

    if (/dangerouslySetInnerHTML/.test(code)) {
      findings.push({
        id: `xss-${file}`,
        category: "security",
        severity: "medium",
        title: "Raw HTML injection point",
        detail: "dangerouslySetInnerHTML can allow XSS if the content is not sanitized.",
        file,
      });
    }

    lines.forEach((line, i) => {
      if (/(^|[^.\w])console\.(log|debug)\(/.test(line)) {
        consoleHits += 1;
        findings.push({
          id: `console-${file}-${i}`,
          category: "quality",
          severity: "low",
          title: "Debug logging left in the build",
          detail: `console statement at line ${i + 1}.`,
          file,
        });
      }
      if (/:\s*any\b/.test(line)) anyHits += 1;
    });

    const imgTags = code.match(/<img\b[^>]*>/g) ?? [];
    for (const tag of imgTags) {
      if (!/\balt=/.test(tag)) {
        imgWithoutAlt += 1;
        findings.push({
          id: `alt-${file}-${imgWithoutAlt}`,
          category: "quality",
          severity: "medium",
          title: "Image without alt text",
          detail: "Every image needs descriptive alt text for screen readers.",
          file,
        });
      }
    }

    if (lines.length > 400) {
      longFiles.push(file);
      findings.push({
        id: `long-${file}`,
        category: "efficiency",
        severity: "low",
        title: "Large module",
        detail: `${lines.length} lines — consider splitting for smaller bundles and easier review.`,
        file,
      });
    }

    for (const match of code.matchAll(/from\s+["']([^."'/][^"']*)["']/g)) {
      const name = match[1] ?? "";
      const parts = name.split("/");
      importedPackages.add(name.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? ""));
    }
  }

  if (anyHits > 0) {
    findings.push({
      id: "any-types",
      category: "quality",
      severity: "low",
      title: "Loosely typed values",
      detail: `${anyHits} explicit \`any\` annotation(s) reduce type safety.`,
    });
  }

  // Dependency usage
  const pkgText = Object.values(pkgRaw)[0] ?? "{}";
  const pkg = JSON.parse(pkgText) as { dependencies?: Record<string, string> };
  const deps = Object.keys(pkg.dependencies ?? {});
  const unused = deps.filter(
    (dep) =>
      !importedPackages.has(dep) &&
      !dep.startsWith("@tanstack/") &&
      !dep.startsWith("@types/") &&
      !["react", "react-dom", "vite", "tailwindcss"].includes(dep),
  );
  if (unused.length > 0) {
    findings.push({
      id: "unused-deps",
      category: "efficiency",
      severity: "low",
      title: `${unused.length} dependency(ies) with no direct import`,
      detail: unused.slice(0, 12).join(", "),
    });
  } else {
    passed.push("Every runtime dependency is imported somewhere in the app");
  }

  // Repo hygiene
  const gitignore = Object.values(gitignoreRaw)[0] ?? "";
  if (!/(^|\n)\.env/.test(gitignore)) {
    findings.push({
      id: "gitignore-env",
      category: "security",
      severity: "high",
      title: "Environment files are not ignored by git",
      detail: "Add .env to .gitignore so credentials never reach the repository.",
      file: ".gitignore",
    });
  } else {
    passed.push(".env files are excluded from version control");
  }

  if (!/(^|\n)\.lovable/.test(gitignore)) {
    findings.push({
      id: "gitignore-lovable",
      category: "quality",
      severity: "low",
      title: "Build metadata folder is not ignored",
      detail: "Add .lovable to .gitignore to keep the repository clean.",
      file: ".gitignore",
    });
  }

  const readme = Object.values(readmeRaw)[0] ?? "";
  if (readme.length < 400) {
    findings.push({
      id: "readme",
      category: "quality",
      severity: "medium",
      title: "README is thin",
      detail: "Document setup, features and tech stack for reviewers.",
      file: "README.md",
    });
  } else {
    passed.push("README documents setup, features and tech stack");
  }

  if (secretHits === 0 && clientEnvSecretHits === 0) {
    passed.push("No hardcoded API keys or tokens found in source");
  }
  if (consoleHits === 0) passed.push("No debug console statements in the shipped code");
  if (imgWithoutAlt === 0) passed.push("All images carry alt text");
  if (longFiles.length === 0) passed.push("No oversized modules — every file stays reviewable");

  const penalty = (category: Finding["category"]) =>
    findings
      .filter((f) => f.category === category)
      .reduce((sum, f) => sum + (f.severity === "high" ? 25 : f.severity === "medium" ? 8 : 3), 0);

  const score = (category: Finding["category"]) => Math.max(0, Math.min(100, 100 - penalty(category)));
  const security = score("security");
  const quality = score("quality");
  const efficiency = score("efficiency");

  return {
    scannedAt: new Date().toISOString(),
    filesScanned: entries.length,
    linesScanned,
    scores: {
      security,
      quality,
      efficiency,
      overall: Math.round((security + quality + efficiency) / 3),
    },
    passed,
    findings: findings.slice(0, 60),
  };
}
