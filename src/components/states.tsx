import { AlertTriangle, RotateCw } from "lucide-react";

export function CardSkeleton() {
  return (
    <div className="glass animate-pulse rounded-2xl p-5">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-3 w-full rounded bg-muted/70" />
      <div className="mt-2 h-3 w-4/5 rounded bg-muted/70" />
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-muted/70" />
        <div className="h-6 w-24 rounded-full bg-muted/70" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-label="Generating ideas"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function LineSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/70" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto h-6 w-6 text-warning" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" /> Try again
      </button>
    </div>
  );
}
