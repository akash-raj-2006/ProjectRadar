import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Clock, ArrowRight } from "lucide-react";
import type { Idea } from "@/lib/mentor-types";

const difficultyTone: Record<string, string> = {
  Beginner: "border-success/40 bg-success/15 text-success",
  Intermediate: "border-warning/40 bg-warning/15 text-warning",
  Advanced: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        difficultyTone[difficulty] ?? "border-border bg-secondary text-muted-foreground"
      }`}
    >
      {difficulty}
    </span>
  );
}

export function IdeaCard({
  idea,
  bookmarked,
  onToggleBookmark,
}: {
  idea: Idea;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <article
      className={`glass lift relative flex flex-col rounded-2xl p-5 ${
        bookmarked ? "animated-border" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold leading-snug">{idea.title}</h3>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove ${idea.title} from compare` : `Bookmark ${idea.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          {bookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-accent" aria-hidden="true" />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{idea.pitch}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={idea.difficulty} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {idea.timeline}
        </span>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs text-accent">
          {idea.domain}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {idea.tags.slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <Link
        to="/idea/$ideaId"
        params={{ ideaId: idea.id }}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Open mentor plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
