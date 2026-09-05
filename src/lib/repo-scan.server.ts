/**
 * Shared static-analysis heuristics used by both the local repo audit and the
 * remote GitHub repository scan.
 */

export type Finding = {
  id: string;
  category: "security" | "quality" | "efficiency";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
};

export type Scores = {
  security: number;
  quality: number;
  efficiency: number;
  overall: number;
};

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9]{20,}/, "OpenAI-style secret key literal"],
  [/AIza[0-9A-Za-z_-]{30,}/, "Google API key literal"],
  [/ghp_[A-Za-z0-9]{20,}/, "GitHub personal access token literal"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, "Hardcoded JWT literal"],
  [/(?:api[_-]?key|secret|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i, "Inline credential literal"],
];

export type AnalysisResult = {
  findings: Finding[];
  passed: string[];
  linesScanned: number;
  filesScanned: number;
  counts: { secrets: number; consoles: number; missingAlt: number; longFiles: number; anyHits: number };
  importedPackages: Set<string>;
};

export function analyzeFiles(files: Record<string, string>): AnalysisResult {
  const findings: Finding[] = [];
  const passed: string[] = [];
  const importedPackages = new Set<string>();
  let linesScanned = 0;
  let secretHits = 0;
  let consoleHits = 0;
  let imgWithoutAlt = 0;
  let anyHits = 0;
  let longFiles = 0;

  const entries = Object.entries(files);

  for (const [file, code] of entries) {
    const lines = code.split("\n");
    linesScanned += lines.length;
    const isServer = /\.server\.ts$|\.functions\.ts$|(^|\/)(server|api)\//.test(file);

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
        break;
      }
    }

    if (/import\.meta\.env\.VITE_[A-Z_]*(SECRET|PRIVATE|SERVICE_ROLE)/.test(code)) {
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

    if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(code)) {
      findings.push({
        id: `xss-${file}`,
        category: "security",
        severity: "medium",
        title: "Raw HTML injection point",
        detail: "Injecting raw HTML can allow XSS if the content is not sanitized.",
        file,
      });
    }

    if (/\beval\s*\(/.test(code)) {
      findings.push({
        id: `eval-${file}`,
        category: "security",
        severity: "high",
        title: "Dynamic code execution",
        detail: "eval() executes arbitrary code and should be removed.",
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
      longFiles += 1;
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

  if (secretHits === 0) passed.push("No hardcoded API keys or tokens found in the scanned source");
  if (consoleHits === 0) passed.push("No debug console statements in the scanned code");
  if (imgWithoutAlt === 0) passed.push("All images carry alt text");
  if (longFiles === 0) passed.push("No oversized modules — every file stays reviewable");

  return {
    findings,
    passed,
    linesScanned,
    filesScanned: entries.length,
    counts: { secrets: secretHits, consoles: consoleHits, missingAlt: imgWithoutAlt, longFiles, anyHits },
    importedPackages,
  };
}

export function scoreFindings(findings: Finding[]): Scores {
  const penalty = (category: Finding["category"]) =>
    findings
      .filter((f) => f.category === category)
      .reduce((sum, f) => sum + (f.severity === "high" ? 25 : f.severity === "medium" ? 8 : 3), 0);
  const score = (category: Finding["category"]) => Math.max(0, Math.min(100, 100 - penalty(category)));
  const security = score("security");
  const quality = score("quality");
  const efficiency = score("efficiency");
  return {
    security,
    quality,
    efficiency,
    overall: Math.round((security + quality + efficiency) / 3),
  };
}
