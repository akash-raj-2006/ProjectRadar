import { lazy } from "react";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { CountUp } from "@/components/count-up";

const RadarCanvas = lazy(() => import("@/components/radar-3d"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProjectRadar — AI Mentor for Final-Year Projects" },
      {
        name: "description",
        content:
          "Generate personalized final-year project ideas, then get a full mentor plan: features, stack, interactive roadmap, uniqueness score and resume line.",
      },
      { property: "og:title", content: "ProjectRadar — AI Mentor for Final-Year Projects" },
      {
        property: "og:description",
        content:
          "Personalized CSE/AI-ML capstone ideas with roadmaps, uniqueness scoring and pitch scripts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const modules = [
  {
    id: "01",
    title: "Skill scan",
    body: "Analyze your actual stack and time budget, then match projects to what you can really ship.",
    span: "lg:col-span-2",
  },
  {
    id: "02",
    title: "Panel Q&A",
    body: "Stress-test the idea against the questions your guide will ask.",
    span: "",
  },
  {
    id: "03",
    title: "Uniqueness score",
    body: "See how done-to-death an idea already is, plus the twist that makes yours stand out.",
    span: "",
  },
  {
    id: "04",
    title: "Roadmap + timers",
    body: "Build steps become a saved checklist with live timers, so it doubles as your tracker.",
    span: "lg:col-span-2",
  },
];

const pipeline = [
  ["01", "Input", "Skills, interests, constraints, solo or team."],
  ["02", "Scan", "Five tailored capstone ideas with difficulty and timeline."],
  ["03", "Mentor", "Full breakdown, roadmap, pitch script, resume line."],
] as const;

function Landing() {
  return (
    <PageShell>
      {/* 01 — HERO */}
      <section className="grid-bg border border-border">
        <div className="grid gap-10 border-b border-border p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
          <div>
            <p className="mono text-[11px] text-muted-foreground">
              SYS/01 — <span className="text-destructive">RADAR ACTIVE</span>
            </p>
            <h1 className="mt-8 font-display text-[13vw] font-extrabold uppercase leading-[0.88] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Stop picking
              <br />
              the same
              <br />
              project.
            </h1>
            <p className="mono mt-6 inline-block border border-cream px-3 py-1 text-[11px]">
              [ As everyone else ]
            </p>
            <p className="mt-7 max-w-md text-base text-muted-foreground">
              AI mentor for CSE &amp; AI-ML capstones that actually feel different — ideas,
              roadmaps, uniqueness scoring and panel prep in one machine.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/start" className="frame-btn">
                [ Initialize scan ]
              </Link>
              <Link
                to="/results"
                className="frame-btn !border-border !text-muted-foreground"
              >
                [ View ideas ]
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="mono mb-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>SCAN_STATUS: ACTIVE</span>
              <span className="text-destructive">◉ LIVE</span>
            </div>
            <div className="border border-border bg-black-soft p-4">
              <ClientOnly
                fallback={<div className="aspect-square w-full bg-black-soft" />}
              >
                <RadarCanvas />
              </ClientOnly>
            </div>
            <div className="mono mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>MATCH_CONFIDENCE</span>
              <span className="text-foreground">
                <CountUp value={98} suffix="%" />
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-cream/10 lg:grid-cols-4 lg:divide-x">
          {[
            ["05", "", "Ideas per scan"],
            ["12", "", "Panel questions"],
            ["100", "%", "Local-first"],
            ["", "", "SYS: READY"],
          ].map(([value, suffix, label], i) => (
            <div key={label} className="border-b border-border p-5 lg:border-b-0">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums">
                {value ? (
                  <CountUp value={Number(value)} suffix={suffix ?? ""} duration={900 + i * 200} />
                ) : (
                  <span className="text-destructive">◉</span>
                )}
              </dd>
              <dd className="mono mt-2 text-[10px] text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 02 — PIPELINE */}
      <section className="mt-14" aria-labelledby="how-it-works">
        <p className="mono text-[11px] text-muted-foreground">/ 02 — SEQUENCE</p>
        <h2
          id="how-it-works"
          className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[-0.03em] sm:text-4xl"
        >
          Scan → match → build
        </h2>
        <ol className="mt-8 grid grid-cols-1 border border-border sm:grid-cols-3">
          {pipeline.map(([id, title, body]) => (
            <li
              key={id}
              className="lift border-b border-border p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="mono text-[11px] text-destructive">{id}</span>
              <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 03 — MODULES (asymmetric grid) */}
      <section className="mt-14" aria-labelledby="features">
        <p className="mono text-[11px] text-muted-foreground">/ 03 — MODULES</p>
        <h2
          id="features"
          className="mt-3 font-display text-3xl font-extrabold uppercase tracking-[-0.03em] sm:text-4xl"
        >
          Built to find different
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-px border border-border bg-border lg:grid-cols-3">
          {modules.map((m) => (
            <article key={m.id} className={`lift bg-background p-7 ${m.span}`}>
              <span className="mono text-[11px] text-destructive">{m.id}</span>
              <h3 className="mt-5 font-display text-2xl font-bold uppercase tracking-tight">
                {m.title}
              </h3>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">{m.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 04 — CTA */}
      <section className="mt-20 border-t border-b border-border py-20 text-center">
        <p className="mono text-[11px] text-muted-foreground">READY?</p>
        <h2 className="mt-6 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">
          Build something
          <br />
          the panel hasn&apos;t
          <br />
          seen 50 times.
        </h2>
        <div className="mt-10 flex justify-center">
          <Link to="/start" className="frame-btn">
            [ Start scan → ]
          </Link>
        </div>
        <p className="mono mt-10 text-[10px] text-muted-foreground">
          SYS/PROJECTRADAR — STATUS: <span className="text-destructive">WAITING</span>
        </p>
      </section>
    </PageShell>
  );
}
