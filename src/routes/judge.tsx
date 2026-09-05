import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck, Gauge, Code2, CheckCircle2, ScanLine, Github, Star } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ErrorState, LineSkeleton } from "@/components/states";
import {
  runRepoAudit,
  scanGithubRepo,
  type AuditReport,
  type Finding,
  type RemoteReport,
} from "@/lib/audit.functions";


export const Route = createFileRoute("/judge")({
  head: () => ({
    meta: [
      { title: "Bot Judge Scan — ProjectRadar" },
      {
        name: "description",
        content:
          "Run a real scan of this repository for security, code quality and efficiency, with scored findings and passed checks.",
      },
      { property: "og:title", content: "Bot Judge Scan — ProjectRadar" },
      {
        property: "og:description",
        content: "Security, code quality and efficiency findings scanned straight from the repo.",
      },
    ],
  }),
  component: JudgePage,
});

const severityStyles: Record<Finding["severity"], string> = {
  high: "border-destructive/50 text-destructive",
  medium: "border-warning/50 text-warning",
  low: "border-border text-muted-foreground",
};

function ScoreCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-brand-gradient"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} score`}
        />
      </div>
    </div>
  );
}

function JudgePage() {
  const scanSelf = useServerFn(runRepoAudit);
  const scanRemote = useServerFn(scanGithubRepo);
  const [mode, setMode] = useState<"self" | "remote">("self");
  const [repoUrl, setRepoUrl] = useState("");
  const [inputError, setInputError] = useState("");

  const selfMutation = useMutation<AuditReport, Error>({ mutationFn: () => scanSelf({}) });
  const remoteMutation = useMutation<RemoteReport, Error, string>({
    mutationFn: (repo: string) => scanRemote({ data: { repo } }),
  });

  const mutation = mode === "self" ? selfMutation : remoteMutation;
  const report: AuditReport | RemoteReport | undefined = mutation.data;
  const remote = mode === "remote" ? remoteMutation.data : undefined;

  const run = () => {
    if (mode === "self") {
      selfMutation.mutate();
      return;
    }
    const value = repoUrl.trim();
    if (!/github\.com\/[^/]+\/[^/]+|^[\w.-]+\/[\w.-]+$/.test(value)) {
      setInputError("Paste a public GitHub repository URL, e.g. https://github.com/owner/repo");
      return;
    }
    setInputError("");
    remoteMutation.mutate(value);
  };

  const groups: Array<{ key: Finding["category"]; label: string }> = [
    { key: "security", label: "Security" },
    { key: "quality", label: "Code quality" },
    { key: "efficiency", label: "Efficiency" },
  ];

  return (
    <PageShell>
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Bot judge scan</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Runs a real static scan for hardcoded credentials, leaked environment values, debug
          logging, missing alt text, oversized modules, unused dependencies and repo hygiene —
          on this project, or on any public GitHub repository you paste.
        </p>

        <div
          role="tablist"
          aria-label="Scan target"
          className="mt-6 inline-flex rounded-xl border border-border p-1"
        >
          {(
            [
              { key: "self", label: "This project" },
              { key: "remote", label: "GitHub repo" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={mode === tab.key}
              onClick={() => setMode(tab.key)}
              className={`min-h-11 rounded-lg px-4 text-sm transition-colors ${
                mode === tab.key ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "remote" ? (
          <div className="mt-4">
            <label htmlFor="repo-url" className="block text-xs text-muted-foreground">
              Public GitHub repository URL
            </label>
            <input
              id="repo-url"
              type="url"
              inputMode="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") run();
              }}
              placeholder="https://github.com/owner/repo"
              className="mt-2 min-h-11 w-full max-w-lg rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            {inputError ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {inputError}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={run}
          disabled={mutation.isPending}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          {mutation.isPending ? "Scanning repo…" : report ? "Re-run scan" : "Run scan"}
        </button>
      </header>

      {mutation.isPending ? (
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass h-32 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="glass rounded-2xl p-6">
            <LineSkeleton lines={6} />
          </div>
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="mt-8">
          <ErrorState
            message={mutation.error?.message || "The scan could not complete."}
            onRetry={run}
          />
        </div>
      ) : null}

      {report && !mutation.isPending ? (
        <div className="mt-8 space-y-6">
          {remote ? (
            <a
              href={remote.url}
              target="_blank"
              rel="noreferrer noopener"
              className="glass flex items-start gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <Github className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-display text-base font-bold">{remote.repo}</span>
                <span className="mt-1 block break-words text-sm text-muted-foreground">
                  {remote.description}
                </span>
                <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  {remote.stars.toLocaleString()} · branch {remote.defaultBranch} ·{" "}
                  {remote.filesInRepo.toLocaleString()} files in repo
                </span>
              </span>
            </a>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard label="Overall" value={report.scores.overall} icon={Gauge} />
            <ScoreCard label="Security" value={report.scores.security} icon={ShieldCheck} />
            <ScoreCard label="Code quality" value={report.scores.quality} icon={Code2} />
            <ScoreCard label="Efficiency" value={report.scores.efficiency} icon={Gauge} />
          </div>

          <p className="text-xs text-muted-foreground">
            {report.filesScanned} files and {report.linesScanned.toLocaleString()} lines scanned at{" "}
            {new Date(report.scannedAt).toLocaleTimeString()}.
          </p>


          <section className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">Checks passed</h2>
            <ul className="mt-3 space-y-2">
              {report.passed.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
              {report.passed.length === 0 ? (
                <li className="text-sm text-muted-foreground">No clean checks yet.</li>
              ) : null}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {groups.map((group) => {
              const items = report.findings.filter((f) => f.category === group.key);
              return (
                <section key={group.key} className="glass rounded-2xl p-5">
                  <h2 className="font-display text-base font-bold">
                    {group.label}{" "}
                    <span className="text-muted-foreground">({items.length})</span>
                  </h2>
                  {items.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No issues detected in this category.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {items.map((finding) => (
                        <li
                          key={finding.id}
                          className={`rounded-xl border px-3 py-2 ${severityStyles[finding.severity]}`}
                        >
                          <p className="text-sm font-semibold text-foreground">{finding.title}</p>
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {finding.detail}
                          </p>
                          {finding.file ? (
                            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                              {finding.file}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
