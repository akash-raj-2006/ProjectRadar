import { z } from "zod";

export const difficulties = ["Beginner", "Intermediate", "Advanced"] as const;

export const ideaSchema = z.object({
  title: z.string(),
  pitch: z.string(),
  difficulty: z.string(),
  timeline: z.string(),
  domain: z.string(),
  tags: z.array(z.string()),
});

export const ideasSchema = z.object({ ideas: z.array(ideaSchema) });

export const breakdownSchema = z.object({
  summary: z.string(),
  features: z.array(z.string()),
  stack: z.array(z.string()),
  roadmap: z.array(z.object({ title: z.string(), detail: z.string() })),
  uniquenessScore: z.number(),
  uniquenessNote: z.string(),
  twist: z.string(),
  improvements: z.array(z.string()),
  pitchScript: z.string(),
  resumeLine: z.string(),
  impactScore: z.number(),
  learningCurve: z.number(),
});

export const generatorInputSchema = z.object({
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  interests: z.array(z.string()),
  timeAvailable: z.string().min(1),
  teamMode: z.string().min(1),
  domain: z.string(),
});

export type Idea = z.infer<typeof ideaSchema> & { id: string };
export type Breakdown = z.infer<typeof breakdownSchema>;
export type GeneratorInput = z.infer<typeof generatorInputSchema>;
