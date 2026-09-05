import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Pause,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { DifficultyBadge } from "@/components/idea-card";
import { ErrorState, LineSkeleton } from "@/components/states";
import { generateBreakdown } from "@/lib/mentor.functions";
import { actions, formatDuration, timerElapsed, useStore } from "@/lib/store";


export const Route = createFileRoute("/idea/$ideaId")({
  head: () => ({
    meta: [
      { title: "Mentor plan — ProjectRadar" },
      {
        name: "description",
        content:
          "Full mentor breakdown: features, tech stack, interactive roadmap, uniqueness score, pitch script and resume line.",
      },
      { property: "og:title", content: "Mentor plan — ProjectRadar" },
      {
        property: "og:description",
        content: "Your project's features, stack, roadmap checklist and pitch script.",
      },
    ],
  }),
  component: IdeaPage,
});

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{clamped}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function IdeaPage() {
  const { ideaId } = Route.useParams();
  const { ideas, breakdowns, progress, input, timers } = useStore();
  const idea = ideas.find((i) => i.id === ideaId);
  const breakdown = breakdowns[ideaId];
  const done = progress[ideaId] ?? [];
  const ideaTimers = useMemo(() => timers[ideaId] ?? {}, [timers, ideaId]);
  const running = Object.values(ideaTimers).some((t) => t.startedAt !== null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const totalTracked = Object.values(ideaTimers).reduce(
    (sum, timer) => sum + timerElapsed(timer, now),
    0,
  );

  const run = useServerFn(generateBreakdown);
  const [refinement, setRefinement] = useState("");
  const requested = useRef(false);


  const mutation = useMutation({
    mutationFn: async (note: string | null) => {
      if (!idea) throw new Error("Idea not found");
      const { id: _id, ...rest } = idea;
      return run({
        data: {
          idea: rest,
          context: input
            ? {
                skills: input.skills,
                timeAvailable: input.timeAvailable,
                teamMode: input.teamMode,
              }
            : null,
          refinement: note,
        },
      });
    },
    onSuccess: (result) => {
      actions.setBreakdown(ideaId, result);
      setRefinement("");
    },
  });

  const mutate = mutation.mutate;
  useEffect(() => {
    if (idea && !breakdown && !requested.current) {
      requested.current = true;
      mutate(null);
    }
  }, [idea, breakdown, mutate]);

  if (!idea) {
    return (
      <PageShell>
        <div className="glass rounded-2xl p-10 text-center">
          <h1 className="font-display text-xl font-bold">This idea isn't in your session</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ideas are saved on this device. Generate a fresh set to continue.
          </p>
          <Link
            to="/start"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-primary-foreground"
          >
            Generate ideas
          </Link>
        </div>
      </PageShell>
    );
  }

  const onRefine = (event: FormEvent) => {
    event.preventDefault();
    const note = refinement.trim();
    if (note.length < 3) {
      toast.error("Add a little more detail for the mentor.");
      return;
    }
    mutation.mutate(note);
  };

  const buildPlanText = () => {
    if (!breakdown) return "";
    return [
      idea.title,
      idea.pitch,
      "",
      "Features:",
      ...breakdown.features.map((f) => `- ${f}`),
      "",
      `Tech stack: ${breakdown.stack.join(", ")}`,
      "",
      "Roadmap:",
      ...breakdown.roadmap.map((s, i) => {
        const spent = timerElapsed(ideaTimers[String(i)], now);
        const status = done.includes(i) ? "done" : "in progress";
        const time = spent > 0 ? `, time spent ${formatDuration(spent)}` : "";
        return `${i + 1}. ${s.title} — ${s.detail} (${status}${time})`;
      }),
      "",
      `Total tracked build time: ${formatDuration(totalTracked)}`,
      "",
      `Uniqueness (${breakdown.uniquenessScore}/100): ${breakdown.uniquenessNote}`,
      `Twist: ${breakdown.twist}`,
      "",
      "Improvements:",
      ...breakdown.improvements.map((f) => `- ${f}`),
      "",
      `Pitch script: ${breakdown.pitchScript}`,
      `Resume line: ${breakdown.resumeLine}`,
    ].join("\n");
  };

  const copyPlan = async () => {
    const text = buildPlanText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Plan copied to clipboard");
    } catch {
      toast.error("Copying isn't available in this browser.");
    }
  };


  const completion = breakdown?.roadmap.length
    ? Math.round((done.length / breakdown.roadmap.length) * 100)
    : 0;

  return (
    <PageShell>
      <Link
        to="/results"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to ideas
      </Link>

      <header className="glass animated-border mt-4 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={idea.difficulty} />
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {idea.timeline}
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs text-accent">
            {idea.domain}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{idea.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">{idea.pitch}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => mutation.mutate(null)}
            disabled={mutation.isPending}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Regenerate plan
          </button>
          <button
            type="button"
            onClick={copyPlan}
            disabled={!breakdown}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy plan
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!breakdown}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Export PDF
          </button>
        </div>
      </header>

      {mutation.isError ? (
        <div className="mt-6">
          <ErrorState
            message="The mentor couldn't build this plan. It happens — try once more."
            onRetry={() => mutation.mutate(null)}
          />
        </div>
      ) : null}

      {mutation.isPending && !breakdown ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <LineSkeleton lines={8} />
          </div>
          <div className="glass rounded-2xl p-6">
            <LineSkeleton lines={5} />
          </div>
        </div>
      ) : null}

      {breakdown ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="glass rounded-2xl p-6" aria-labelledby="features-heading">
              <h2 id="features-heading" className="font-display text-lg font-bold">
                Core features
              </h2>
              <ul className="mt-4 space-y-2.5">
                {breakdown.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass rounded-2xl p-6" aria-labelledby="stack-heading">
              <h2 id="stack-heading" className="font-display text-lg font-bold">
                Tech stack
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {breakdown.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-6" aria-labelledby="roadmap-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="roadmap-heading" className="font-display text-lg font-bold">
                  Build roadmap
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span aria-live="polite">{formatDuration(totalTracked)} tracked</span>
                  </span>
                  <span>{completion}% complete</span>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <ul className="mt-5 space-y-2">
                {breakdown.roadmap.map((step, index) => {
                  const checked = done.includes(index);
                  const timer = ideaTimers[String(index)];
                  const isRunning = timer?.startedAt != null;
                  const spent = timerElapsed(timer, now);
                  return (
                    <li
                      key={`${step.title}-${index}`}
                      className={`rounded-xl border p-3 transition-colors ${
                        isRunning ? "border-primary bg-secondary/50" : "border-border/70"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => actions.toggleStep(ideaId, index)}
                            className="mt-1 h-5 w-5 shrink-0 accent-[oklch(0.66_0.24_296)]"
                          />
                          <span>
                            <span
                              className={`block text-sm font-semibold ${
                                checked ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              {index + 1}. {step.title}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {step.detail}
                            </span>
                          </span>
                        </label>

                        <div className="flex shrink-0 items-center gap-2 sm:pl-3">
                          <span
                            className={`font-mono text-sm tabular-nums ${
                              isRunning ? "text-foreground" : "text-muted-foreground"
                            }`}
                            aria-label={`Time spent on step ${index + 1}`}
                          >
                            {formatDuration(spent)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              isRunning
                                ? actions.pauseStepTimer(ideaId, index)
                                : actions.startStepTimer(ideaId, index)
                            }
                            aria-label={
                              isRunning
                                ? `Pause timer for step ${index + 1}`
                                : `Start timer for step ${index + 1}`
                            }
                            className="grid h-11 w-11 place-items-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary"
                          >
                            {isRunning ? (
                              <Pause className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Play className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => actions.resetStepTimer(ideaId, index)}
                            disabled={spent === 0}
                            aria-label={`Reset timer for step ${index + 1}`}
                            className="grid h-11 w-11 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Only one step runs at a time — starting another banks the current one. Timers keep
                counting across page reloads on this device.
              </p>
            </section>



            <section className="glass rounded-2xl p-6" aria-labelledby="refine-heading">
              <h2 id="refine-heading" className="font-display text-lg font-bold">
                Ask your mentor
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                e.g. "make it more unique", "add a mobile app version"
              </p>
              <form onSubmit={onRefine} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="refinement" className="sr-only">
                  Refinement request
                </label>
                <input
                  id="refinement"
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  maxLength={280}
                  placeholder="How should the plan change?"
                  className="glass min-h-12 flex-1 rounded-xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  Refine
                </button>
              </form>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="glass rounded-2xl p-6" aria-labelledby="scores-heading">
              <h2 id="scores-heading" className="font-display text-lg font-bold">
                Signal scores
              </h2>
              <div className="mt-4 space-y-4">
                <ScoreBar label="Uniqueness" value={breakdown.uniquenessScore} />
                <ScoreBar label="Impact" value={breakdown.impactScore} />
                <ScoreBar label="Learning curve" value={breakdown.learningCurve} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{breakdown.uniquenessNote}</p>
              <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs text-foreground">
                <strong className="text-accent">Twist:</strong> {breakdown.twist}
              </p>
            </section>

            <section className="glass rounded-2xl p-6" aria-labelledby="improve-heading">
              <h2 id="improve-heading" className="font-display text-lg font-bold">
                Stretch goals
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                {breakdown.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="glass rounded-2xl p-6" aria-labelledby="pitch-heading">
              <h2 id="pitch-heading" className="font-display text-lg font-bold">
                Explain to my mentor
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {breakdown.pitchScript}
              </p>
            </section>

            <section className="glass rounded-2xl p-6" aria-labelledby="resume-heading">
              <h2 id="resume-heading" className="font-display text-lg font-bold">
                Resume line
              </h2>
              <p className="mt-3 rounded-xl bg-secondary p-3 text-sm">{breakdown.resumeLine}</p>
            </section>
          </aside>
        </div>
      ) : null}
    </PageShell>
  );
}
