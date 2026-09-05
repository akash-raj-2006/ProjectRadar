import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Code2, Bug, Rocket, StickyNote, Trash2, Plus, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { actions, logKinds, useStore, type LogKind, type BuildLog } from "@/lib/store";
import { ChartTooltip, Grid, Line, LineChart, XAxis, type ChartDatum } from "@/components/charts/line-chart";

/** Cumulative daily activity series: code written, bugs fixed, deploys. */
function buildMomentum(logs: BuildLog[]): ChartDatum[] {
  if (logs.length === 0) return [];
  const byDay = new Map<string, { code: number; bugs: number; deploys: number }>();
  for (const log of logs) {
    const key = new Date(log.createdAt).toISOString().slice(0, 10);
    const day = byDay.get(key) ?? { code: 0, bugs: 0, deploys: 0 };
    if (log.kind === "code") day.code += 1;
    else if (log.kind === "bug") day.bugs += 1;
    else if (log.kind === "deploy") day.deploys += 1;
    byDay.set(key, day);
  }
  const days = [...byDay.keys()].sort();
  const out: ChartDatum[] = [];
  let code = 0;
  let bugs = 0;
  let deploys = 0;
  for (const key of days) {
    const day = byDay.get(key);
    if (!day) continue;
    code += day.code;
    bugs += day.bugs;
    deploys += day.deploys;
    out.push({ date: new Date(`${key}T12:00:00`), code, bugs, deploys });
  }
  return out;
}

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "Build Tracker — ProjectRadar" },
      {
        name: "description",
        content:
          "Log code written, bugs fixed and deployments for each final-year project idea so your roadmap matches what you actually built.",
      },
      { property: "og:title", content: "Build Tracker — ProjectRadar" },
      {
        property: "og:description",
        content: "A running build journal per idea: code, bug fixes, deployments and notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackerPage,
});

const kindMeta: Record<LogKind, { label: string; icon: typeof Code2; tone: string }> = {
  code: { label: "Code written", icon: Code2, tone: "text-primary" },
  bug: { label: "Bug fixed", icon: Bug, tone: "text-warning" },
  deploy: { label: "Deployed", icon: Rocket, tone: "text-success" },
  note: { label: "Note", icon: StickyNote, tone: "text-muted-foreground" },
};

function TrackerPage() {
  const { ideas, bookmarks, breakdowns, progress, logs } = useStore();
  const tracked = useMemo(() => {
    const relevant = ideas.filter(
      (idea) => bookmarks.includes(idea.id) || breakdowns[idea.id] || (progress[idea.id]?.length ?? 0) > 0,
    );
    return relevant.length > 0 ? relevant : ideas;
  }, [ideas, bookmarks, breakdowns, progress]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [kind, setKind] = useState<LogKind>("code");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const current = activeId ?? tracked[0]?.id ?? null;
  const idea = tracked.find((i) => i.id === current) ?? null;
  const ideaLogs = logs.filter((l) => l.ideaId === current);
  const steps = current ? (breakdowns[current]?.roadmap.length ?? 0) : 0;
  const done = current ? (progress[current]?.length ?? 0) : 0;
  const roadmapPct = steps > 0 ? Math.round((done / steps) * 100) : 0;
  const deploys = ideaLogs.filter((l) => l.kind === "deploy").length;
  const momentum = useMemo(() => buildMomentum(ideaLogs), [ideaLogs]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = note.trim();
    if (!current) return;
    if (trimmed.length < 3) {
      setError("Write at least a few words about what you did.");
      return;
    }
    if (trimmed.length > 300) {
      setError("Keep each entry under 300 characters.");
      return;
    }
    actions.addLog(current, kind, trimmed);
    setNote("");
    setError("");
  }

  return (
    <PageShell>
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Build tracker</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Log what you actually built — code written, bugs fixed, deployments — so your roadmap
          reflects reality instead of the plan you started with.
        </p>
      </header>

      {tracked.length === 0 ? (
        <div className="glass mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Generate and open an idea first, then come back to log your progress.
          </p>
          <Link
            to="/start"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground"
          >
            Generate ideas
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label="Tracked ideas" className="glass rounded-2xl p-3">
            <ul className="space-y-1">
              {tracked.map((item) => {
                const count = logs.filter((l) => l.ideaId === item.id).length;
                const selected = item.id === current;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="line-clamp-2">{item.title}</span>
                      <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs text-foreground">
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-6">
            {idea ? (
              <section className="glass rounded-2xl p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold">{idea.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{idea.pitch}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Roadmap done", value: `${roadmapPct}%` },
                    { label: "Log entries", value: `${ideaLogs.length}` },
                    { label: "Bugs fixed", value: `${ideaLogs.filter((l) => l.kind === "bug").length}` },
                    { label: "Deploys", value: `${deploys}` },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border px-3 py-2">
                      <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                      <dd className="font-display text-lg font-bold">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-brand-gradient"
                    style={{ width: `${roadmapPct}%` }}
                    role="progressbar"
                    aria-valuenow={roadmapPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Roadmap completion"
                  />
                </div>
              </section>
            ) : null}

            <section className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold">Momentum</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Cumulative build activity for this idea — hover the chart to inspect a day.
              </p>
              {momentum.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Log your first entry below and your progress curve will appear here.
                </p>
              ) : (
                <>
                  <div className="mt-4">
                    <LineChart data={momentum} aspectRatio="2 / 1" style={{ minHeight: 220 }}>
                      <Grid horizontal numTicksRows={4} />
                      <Line dataKey="code" stroke="var(--primary)" />
                      <Line dataKey="bugs" stroke="var(--warning)" />
                      <Line dataKey="deploys" stroke="var(--success)" />
                      <XAxis numTicks={5} />
                      <ChartTooltip />
                    </LineChart>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Chart legend">
                    {[
                      { label: "Code entries", color: "var(--primary)" },
                      { label: "Bugs fixed", color: "var(--warning)" },
                      { label: "Deploys", color: "var(--success)" },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: item.color }}
                          aria-hidden="true"
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold">Log an update</h2>
              <fieldset className="mt-4">
                <legend className="text-xs text-muted-foreground">What happened?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {logKinds.map((k) => {
                    const Icon = kindMeta[k].icon;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        aria-pressed={kind === k}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm transition-colors ${
                          kind === k
                            ? "border-primary bg-secondary text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {kindMeta[k].label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label htmlFor="log-note" className="mt-4 block text-xs text-muted-foreground">
                Details
              </label>
              <textarea
                id="log-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Wired the auth flow and fixed the token refresh bug…"
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              {error ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add entry
              </button>
            </form>

            <section className="glass rounded-2xl p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold">Build journal</h2>
              {ideaLogs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No entries yet for this idea. Your first log will appear here.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {ideaLogs.map((log) => {
                    const meta = kindMeta[log.kind];
                    const Icon = meta.icon;
                    return (
                      <li
                        key={log.id}
                        className="flex items-start gap-3 rounded-xl border border-border px-3 py-3"
                      >
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <p className="mt-1 break-words text-sm text-muted-foreground">{log.note}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => actions.removeLog(log.id)}
                          aria-label="Delete log entry"
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </PageShell>
  );
}
