import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { IdeaCard } from "@/components/idea-card";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your project ideas — ProjectRadar" },
      {
        name: "description",
        content:
          "Browse AI-generated final-year project ideas, filter by difficulty and domain, and bookmark favourites to compare.",
      },
      { property: "og:title", content: "Your project ideas — ProjectRadar" },
      {
        property: "og:description",
        content: "Filter, bookmark and open the full mentor plan for each idea.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { ideas, bookmarks } = useStore();
  const [difficulty, setDifficulty] = useState("All");
  const [domain, setDomain] = useState("All");

  const domains = useMemo(
    () => ["All", ...Array.from(new Set(ideas.map((i) => i.domain)))],
    [ideas],
  );

  const filtered = ideas.filter(
    (idea) =>
      (difficulty === "All" || idea.difficulty === difficulty) &&
      (domain === "All" || idea.domain === domain),
  );

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Your <span className="text-gradient">idea shortlist</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ideas.length
              ? "Bookmark two or three, then compare them side by side."
              : "No ideas yet — generate a set to get started."}
          </p>
        </div>
        <Link
          to="/start"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          {ideas.length ? "Regenerate set" : "Generate ideas"}
        </Link>
      </div>

      {ideas.length ? (
        <>
          <div className="mt-8 flex flex-wrap gap-3">
            <div>
              <label htmlFor="filter-difficulty" className="sr-only">
                Filter by difficulty
              </label>
              <select
                id="filter-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="glass min-h-11 rounded-xl px-4 text-sm outline-none"
              >
                {["All", "Beginner", "Intermediate", "Advanced"].map((d) => (
                  <option key={d} value={d} className="bg-popover">
                    {d === "All" ? "All difficulties" : d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-domain" className="sr-only">
                Filter by domain
              </label>
              <select
                id="filter-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="glass min-h-11 rounded-xl px-4 text-sm outline-none"
              >
                {domains.map((d) => (
                  <option key={d} value={d} className="bg-popover">
                    {d === "All" ? "All domains" : d}
                  </option>
                ))}
              </select>
            </div>
            {bookmarks.length ? (
              <Link
                to="/compare"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground"
              >
                Compare {bookmarks.length} bookmarked
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                bookmarked={bookmarks.includes(idea.id)}
                onToggleBookmark={() => actions.toggleBookmark(idea.id)}
              />
            ))}
          </div>

          {!filtered.length ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              No ideas match those filters.
            </p>
          ) : null}
        </>
      ) : (
        <div className="glass mt-10 rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Tell the mentor about your skills and it will propose five tailored projects.
          </p>
          <Link
            to="/start"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-primary-foreground"
          >
            Start now
          </Link>
        </div>
      )}
    </PageShell>
  );
}
