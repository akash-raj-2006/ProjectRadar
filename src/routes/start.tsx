import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Loader2, Users, User } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { TagInput } from "@/components/tag-input";
import { ErrorState } from "@/components/states";
import { generateIdeas } from "@/lib/mentor.functions";
import { generatorInputSchema, type GeneratorInput } from "@/lib/mentor-types";
import { actions, makeId, useStore } from "@/lib/store";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Build your profile — ProjectRadar" },
      {
        name: "description",
        content:
          "Enter your skills, interests, time budget and team setup to get final-year project ideas matched to you.",
      },
      { property: "og:title", content: "Build your profile — ProjectRadar" },
      {
        property: "og:description",
        content: "Skills in, tailored capstone project ideas out.",
      },
    ],
  }),
  component: StartPage,
});

const skillIdeas = ["React", "Python", "Node.js", "TensorFlow", "SQL", "Flutter", "AWS", "C++"];
const interestIdeas = [
  "Healthcare",
  "Fintech",
  "Computer vision",
  "Sustainability",
  "EdTech",
  "Robotics",
  "Cybersecurity",
  "Agritech",
];
const timeOptions = ["2-4 weeks", "1-2 months", "3-4 months", "A full semester"];
const domainOptions = ["Any", "AI / ML", "Web", "Mobile", "IoT / Hardware", "Data science", "Security"];

function StartPage() {
  const navigate = useNavigate();
  const { input } = useStore();
  const run = useServerFn(generateIdeas);

  const [skills, setSkills] = useState<string[]>(input?.skills ?? []);
  const [interests, setInterests] = useState<string[]>(input?.interests ?? []);
  const [timeAvailable, setTimeAvailable] = useState(input?.timeAvailable ?? "1-2 months");
  const [teamMode, setTeamMode] = useState(input?.teamMode ?? "Solo");
  const [domain, setDomain] = useState(input?.domain ?? "Any");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (payload: GeneratorInput) => {
      const result = await run({ data: payload });
      return result.ideas.map((idea, index) => ({ ...idea, id: makeId(idea.title, index) }));
    },
    onSuccess: (ideas, payload) => {
      actions.saveRun(payload, ideas);
      navigate({ to: "/results" });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = generatorInputSchema.safeParse({
      skills,
      interests,
      timeAvailable,
      teamMode,
      domain,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Tell your <span className="text-gradient">mentor</span> about you
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The more specific your skills and interests, the sharper the ideas.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-7">
          <TagInput
            id="skills"
            label="Your skills"
            placeholder="Type a skill and press Enter"
            suggestions={skillIdeas}
            value={skills}
            onChange={setSkills}
            error={errors["skills"]}
          />

          <TagInput
            id="interests"
            label="Interests & problem areas"
            placeholder="e.g. healthcare, computer vision"
            suggestions={interestIdeas}
            value={interests}
            onChange={setInterests}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="time" className="font-display text-sm font-semibold">
                Time available
              </label>
              <select
                id="time"
                value={timeAvailable}
                onChange={(e) => setTimeAvailable(e.target.value)}
                className="glass mt-2 min-h-12 w-full rounded-2xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {timeOptions.map((option) => (
                  <option key={option} value={option} className="bg-popover">
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="domain" className="font-display text-sm font-semibold">
                Domain preference
              </label>
              <select
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="glass mt-2 min-h-12 w-full rounded-2xl px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {domainOptions.map((option) => (
                  <option key={option} value={option} className="bg-popover">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="font-display text-sm font-semibold">Working style</legend>
            <div className="glass mt-2 grid grid-cols-2 gap-2 rounded-2xl p-2">
              {(
                [
                  { value: "Solo", icon: User },
                  { value: "Team", icon: Users },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTeamMode(option.value)}
                  aria-pressed={teamMode === option.value}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                    teamMode === option.value
                      ? "bg-brand-gradient text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <option.icon className="h-4 w-4" aria-hidden="true" />
                  {option.value}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating ideas…
              </>
            ) : (
              "Generate project ideas"
            )}
          </button>
        </form>

        {mutation.isError ? (
          <div className="mt-6">
            <ErrorState
              message="We couldn't reach the AI mentor. Check your connection and try again."
              onRetry={() =>
                mutation.mutate({ skills, interests, timeAvailable, teamMode, domain })
              }
            />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
