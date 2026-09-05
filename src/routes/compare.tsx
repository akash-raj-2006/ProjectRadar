import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { DifficultyBadge } from "@/components/idea-card";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare bookmarked ideas — ProjectRadar" },
      {
        name: "description",
        content:
          "Weigh your bookmarked final-year project ideas side by side on difficulty, impact, timeline and learning curve.",
      },
      { property: "og:title", content: "Compare bookmarked ideas — ProjectRadar" },
      {
        property: "og:description",
        content: "Difficulty vs impact vs learning curve, side by side.",
      },
    ],
  }),
  component: ComparePage,
});

function Metric({ label, value }: { label: string; value: number | null }) {
  const clamped = value === null ? null : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{clamped ?? "—"}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${clamped ?? 0}%` }} />
      </div>
    </div>
  );
}

function ComparePage() {
  const { ideas, bookmarks, breakdowns } = useStore();
  const selected = ideas.filter((idea) => bookmarks.includes(idea.id)).slice(0, 3);

  return (
    <PageShell>
      <h1 className="text-3xl font-bold sm:text-4xl">
        Compare your <span className="text-gradient">finalists</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Scores appear once you've opened an idea's mentor plan.
      </p>

      {selected.length ? (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selected.map((idea) => {
            const breakdown = breakdowns[idea.id];
            return (
              <article key={idea.id} className="glass lift flex flex-col rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-base font-bold leading-snug">{idea.title}</h2>
                  <button
                    type="button"
                    onClick={() => actions.toggleBookmark(idea.id)}
                    aria-label={`Remove ${idea.title} from compare`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={idea.difficulty} />
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    {idea.timeline}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{idea.pitch}</p>

                <div className="mt-5 space-y-3">
                  <Metric label="Uniqueness" value={breakdown?.uniquenessScore ?? null} />
                  <Metric label="Impact" value={breakdown?.impactScore ?? null} />
                  <Metric label="Learning curve" value={breakdown?.learningCurve ?? null} />
                </div>

                <Link
                  to="/idea/$ideaId"
                  params={{ ideaId: idea.id }}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  {breakdown ? "Open plan" : "Generate plan"}
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass mt-10 rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Bookmark two or three ideas from your shortlist to compare them here.
          </p>
          <Link
            to="/results"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-primary-foreground"
          >
            Go to ideas
          </Link>
        </div>
      )}
    </PageShell>
  );
}
