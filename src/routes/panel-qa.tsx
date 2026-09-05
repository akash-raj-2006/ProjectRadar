import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, FileDown, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/panel-qa")({
  head: () => ({
    meta: [
      { title: "Panel Q&A Prep — ProjectRadar" },
      {
        name: "description",
        content:
          "Write and rehearse your answers to the questions a final-year project panel always asks, then export the whole sheet as a PDF.",
      },
      { property: "og:title", content: "Panel Q&A Prep — ProjectRadar" },
      {
        property: "og:description",
        content: "Prepare panel and viva answers for your project and export them as a PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelQaPage,
});

type Question = { id: string; prompt: string; hint: string };

const QUESTIONS: Question[] = [
  {
    id: "problem",
    prompt: "What problem does your project solve, and for whom?",
    hint: "One sentence on the pain, one on who feels it.",
  },
  {
    id: "existing",
    prompt: "How is this different from solutions that already exist?",
    hint: "Name two existing tools and the gap you fill.",
  },
  {
    id: "architecture",
    prompt: "Walk us through your system architecture.",
    hint: "Frontend, backend, data store, external services and how a request flows.",
  },
  {
    id: "stack",
    prompt: "Why did you choose this tech stack?",
    hint: "Give a reason per major choice, not just familiarity.",
  },
  {
    id: "hardest",
    prompt: "What was the hardest technical problem you faced, and how did you fix it?",
    hint: "Symptom, cause, fix, what you learned.",
  },
  {
    id: "data",
    prompt: "Where does your data come from and how is it validated?",
    hint: "Sources, schema, validation rules, edge cases.",
  },
  {
    id: "security",
    prompt: "How do you handle security and user privacy?",
    hint: "Secrets handling, input validation, access rules, what data you never store.",
  },
  {
    id: "testing",
    prompt: "How did you test it and what still fails?",
    hint: "Be honest about known limits — panels reward it.",
  },
  {
    id: "scale",
    prompt: "What happens if usage grows 100x?",
    hint: "Bottleneck, and the one change you would make first.",
  },
  {
    id: "contribution",
    prompt: "If this is a team project, what exactly did you build?",
    hint: "Your modules, your commits, your decisions.",
  },
  {
    id: "future",
    prompt: "What would you add with three more months?",
    hint: "Two concrete features plus why they matter.",
  },
  {
    id: "learning",
    prompt: "What did you personally learn from this project?",
    hint: "Skill, mindset or process change — with evidence.",
  },
];

function PanelQaPage() {
  const { ideas, bookmarks, answers } = useStore();
  const options = useMemo(() => {
    const marked = ideas.filter((i) => bookmarks.includes(i.id));
    return marked.length > 0 ? marked : ideas;
  }, [ideas, bookmarks]);

  const [selected, setSelected] = useState<string>("");
  const activeId = selected || options[0]?.id || "";
  const activeIdea = ideas.find((i) => i.id === activeId);
  const sheet = answers[activeId] ?? {};
  const answered = QUESTIONS.filter((q) => (sheet[q.id] ?? "").trim().length > 0).length;

  const asText = () =>
    [
      `Panel Q&A — ${activeIdea?.title ?? "My project"}`,
      "",
      ...QUESTIONS.flatMap((q) => [q.prompt, (sheet[q.id] ?? "").trim() || "(not answered yet)", ""]),
    ].join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast.success("Q&A sheet copied");
    } catch {
      toast.error("Copying isn't available in this browser.");
    }
  };

  return (
    <PageShell>
      <div className="print-doc">
        <header className="rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground no-print">
            <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" /> Viva &amp; panel prep
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Panel Q&amp;A
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Write your own answers to the questions panels ask every year. Everything saves on this
            device, and you can export the whole sheet as a PDF to revise from.
          </p>
        </header>

        {ideas.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Generate a project idea first — your Q&amp;A sheet is saved against it.
            </p>
            <Link
              to="/start"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground"
            >
              Generate ideas
            </Link>
          </div>
        ) : (
          <>
            <div className="glass mt-8 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="qa-idea" className="text-xs font-semibold text-muted-foreground">
                  Project
                </label>
                <select
                  id="qa-idea"
                  value={activeId}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary no-print"
                >
                  {options.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  {answered} of {QUESTIONS.length} questions answered
                </p>
              </div>
              <div className="flex flex-wrap gap-2 no-print">
                <button
                  type="button"
                  onClick={copyAll}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy sheet
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" /> Export PDF
                </button>
              </div>
            </div>

            <ol className="mt-6 space-y-4">
              {QUESTIONS.map((question, index) => {
                const value = sheet[question.id] ?? "";
                return (
                  <li key={question.id} className="glass rounded-2xl p-5">
                    <label
                      htmlFor={`qa-${question.id}`}
                      className="block text-sm font-semibold text-foreground"
                    >
                      {index + 1}. {question.prompt}
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">{question.hint}</p>
                    <textarea
                      id={`qa-${question.id}`}
                      value={value}
                      rows={3}
                      maxLength={2000}
                      onChange={(e) => actions.setAnswer(activeId, question.id, e.target.value)}
                      placeholder="Your answer…"
                      className="mt-3 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </PageShell>
  );
}
