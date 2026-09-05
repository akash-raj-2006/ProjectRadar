import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="mono">SYS/PROJECTRADAR — AI mentor for final-year projects</span>
          <span className="mono">
            STATUS: <span className="text-destructive">ONLINE</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
