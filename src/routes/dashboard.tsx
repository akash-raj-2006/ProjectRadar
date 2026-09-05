import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Github, Star, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { LineSkeleton } from "@/components/states";
import { findReferenceRepo, type RepoMatch } from "@/lib/github.functions";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — ProjectRadar" },
      {
        name: "description",
        content:
          "Track bookmarked final-year project ideas, roadmap progress and a matching public GitHub repository for each idea.",
      },
      { property: "og:title", content: "Your Dashboard — ProjectRadar" },
      {
        property: "og:description",
        content: "Bookmarked ideas, build progress and reference GitHub repos in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { ideas, bookmarks, breakdowns, progress } = useStore();
  const saved = ideas.filter((idea) => bookmarks.includes(idea.id));
  const lookup = useServerFn(findReferenceRepo);

  const repoQueries = useQueries({
    queries: saved.map((idea) => ({
      queryKey: ["repo", idea.id],
      queryFn: () => lookup({ data: { query: idea.title } }) as Promise<RepoMatch>,
      staleTime: 1000 * 60 * 30,
      retry: 1,
    })),
  });

  return (
    <PageShell>
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Your dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Every idea you bookmarked, how far along its build roadmap you are, and the closest
          public GitHub project to learn from.
        </p>
      </header>

      {saved.length === 0 ? (
        <div className="glass mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t bookmarked any ideas yet.
          </p>
          <Link
            to="/start"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground"
          >
            Generate ideas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {saved.map((idea, index) => {
            const steps = breakdowns[idea.id]?.roadmap.length ?? 0;
            const done = (progress[idea.id] ?? []).length;
            const percent = steps > 0 ? Math.round((done / steps) * 100) : 0;
            const repoQuery = repoQueries[index];
            const repo = repoQuery?.data ?? null;

            return (
              <article key={idea.id} className="glass lift rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {idea.difficulty}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {idea.timeline}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {idea.domain}
                  </span>
                </div>

                <h2 className="mt-3 font-display text-lg font-bold">{idea.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{idea.pitch}</p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Roadmap progress</span>
                    <span>
                      {steps > 0 ? `${done}/${steps} steps · ${percent}%` : "Plan not opened yet"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-brand-gradient transition-all"
                      style={{ width: `${percent}%` }}
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Roadmap progress for ${idea.title}`}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border/70 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Github className="h-4 w-4" aria-hidden="true" /> Reference repo
                  </div>
                  {repoQuery?.isPending ? (
                    <div className="mt-2">
                      <LineSkeleton lines={2} />
                    </div>
                  ) : repoQuery?.isError ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p className="text-xs text-muted-foreground">
                        Couldn&apos;t load a match right now.
                      </p>
                      <button
                        type="button"
                        onClick={() => repoQuery.refetch()}
                        className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : repo ? (
                    <>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block break-all text-sm font-semibold text-gradient"
                      >
                        {repo.fullName}
                      </a>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {repo.description}
                      </p>
                      <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {repo.stars.toLocaleString()}
                        </span>
                        <span>{repo.language}</span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No close public project found — that&apos;s a good uniqueness signal.
                    </p>
                  )}
                </div>

                <Link
                  to="/idea/$ideaId"
                  params={{ ideaId: idea.id }}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground"
                >
                  Open mentor plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
