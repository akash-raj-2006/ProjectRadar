import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

const links = [
  { to: "/", label: "Home" },
  { to: "/start", label: "Generate" },
  { to: "/results", label: "Ideas" },
  { to: "/compare", label: "Compare" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tracker", label: "Tracker" },
  { to: "/panel-qa", label: "Panel Q&A" },
  { to: "/judge", label: "Bot judge" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { bookmarks } = useStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-black/95 backdrop-blur-sm">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Link to="/" className="flex items-center gap-2.5" aria-label="ProjectRadar home">
          <span
            className="h-2.5 w-2.5 rounded-full bg-destructive"
            aria-hidden="true"
          />
          <span className="font-display text-sm font-extrabold uppercase tracking-[0.2em] sm:text-base">
            ProjectRadar
          </span>
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                activeProps={{ "data-active": "true" }}
                className="nav-underline mono py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground [&[data-active='true']]:text-foreground"
              >
                {link.label}
                {link.to === "/compare" && bookmarks.length > 0 ? (
                  <span className="ml-1.5 text-destructive">[{bookmarks.length}]</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/start"
          className="frame-btn hidden !min-h-11 md:inline-flex"
        >
          [ Initialize ]
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 place-items-center border border-cream/60 text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open ? (
        <ul className="border-t border-border md:hidden">
          {links.map((link) => (
            <li key={link.to} className="border-b border-border">
              <Link
                to={link.to}
                onClick={() => setOpen(false)}
                className="mono flex min-h-12 items-center px-5 text-[11px] text-muted-foreground"
                activeProps={{ className: "text-destructive" }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
