# ProjectRadar — AI Project Idea Generator & Mentor

An AI mentor platform for final-year CSE / AI-ML students. It generates personalized
capstone project ideas from your skills and interests, then mentors you through the
build: features, tech stack, an interactive roadmap checklist, a uniqueness score,
stretch goals, an elevator-pitch script and a resume line.

## Features

- **Personalized idea generation** — skills, interests, time budget, solo/team and domain in; 5 tailored ideas out.
- **Mentor breakdown page** — features, tech stack, ordered build roadmap, improvement suggestions.
- **Uniqueness score** — how often the idea has already been built, plus a concrete twist to stand out.
- **Interactive roadmap** — roadmap steps are checkboxes with progress saved locally, so it doubles as a tracker.
- **"Explain to my mentor" mode** — a spoken elevator-pitch script for your guide or review panel.
- **Compare mode** — bookmark up to three ideas and weigh difficulty, impact and learning curve side by side.
- **Resume-line generator** — a recruiter-ready bullet for the finished project.
- **Refine in place** — ask for changes ("make it more unique", "add a mobile app") and the plan regenerates.
- **Export** — copy the full plan to the clipboard or print it to PDF.

## Tech stack

- TanStack Start (React 19 + TanStack Router) with SSR
- Vite 8, TypeScript
- Tailwind CSS v4 with a custom dark, glassmorphic design system (oklch tokens)
- TanStack Query for async state
- Vercel AI SDK via the Lovable AI Gateway (server-side only)
- Zod for input validation
- lucide-react icons, sonner toasts

## Getting started

```bash
bun install     # or npm install
bun run dev     # starts the dev server on http://localhost:8080
bun run build   # production build
bun run lint    # lint
```

## Environment variables

The AI calls run server-side only. Create a `.env` file (never commit it):

```
LOVABLE_API_KEY=your_key_here
```

`.env` and `.lovable` are excluded via `.gitignore`. No API key is ever exposed to
the browser — all model calls happen inside server functions in
`src/lib/mentor.functions.ts`.

## Project structure

```
src/
  components/     UI building blocks (nav, idea card, tag input, loading/error states)
  lib/
    ai-gateway.server.ts   server-only AI provider setup
    mentor.functions.ts    server functions for idea + plan generation
    mentor-types.ts        zod schemas and shared types
    store.ts               local-storage backed client state
  routes/         file-based routes: /, /start, /results, /idea/$ideaId, /compare
  styles.css      design tokens and custom utilities
```

## Notes

- No auth is required; bookmarks and roadmap progress are stored in the browser.
- Every AI call has a skeleton loading state and a friendly retry error state.
- Forms are validated with Zod and use accessible labels and 44px+ tap targets.
