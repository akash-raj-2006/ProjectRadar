import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { getMentorModel } from "./ai-gateway.server";
import {
  breakdownSchema,
  generatorInputSchema,
  ideasSchema,
  ideaSchema,
} from "./mentor-types";

function parseFallback<T>(text: string | undefined, schema: z.ZodType<T>): T | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return schema.parse(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

export const generateIdeas = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => generatorInputSchema.parse(input))
  .handler(async ({ data }) => {
    const prompt = [
      "You are a final-year project mentor for CSE / AI-ML students.",
      `Skills: ${data.skills.join(", ")}`,
      `Interests: ${data.interests.join(", ") || "open"}`,
      `Time available: ${data.timeAvailable}`,
      `Team: ${data.teamMode}`,
      `Preferred domain: ${data.domain || "any"}`,
      "Propose exactly 5 distinct, genuinely buildable capstone project ideas.",
      "Avoid cliches (todo app, basic CRUD portal) unless given a sharp twist.",
      "difficulty must be one of Beginner, Intermediate, Advanced.",
      "timeline is a short string like '6-8 weeks'. tags: 3-5 short technology or theme tags.",
      "pitch: one punchy sentence under 160 characters.",
    ].join("\n");

    try {
      const result = streamText({
        model: getMentorModel(),
        prompt,
        output: Output.object({ schema: ideasSchema }),
      });
      const output = await result.output;
      return { ideas: output.ideas.slice(0, 6) };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const fallback = parseFallback(error.text, ideasSchema);
        if (fallback) return { ideas: fallback.ideas.slice(0, 6) };
      }
      throw new Error("The AI mentor could not generate ideas right now.");
    }
  });

const breakdownInput = z.object({
  idea: ideaSchema,
  context: z
    .object({
      skills: z.array(z.string()),
      timeAvailable: z.string(),
      teamMode: z.string(),
    })
    .nullable(),
  refinement: z.string().nullable(),
});

export const generateBreakdown = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => breakdownInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = [
      "You are an experienced final-year project mentor. Produce a full mentoring breakdown.",
      `Project: ${data.idea.title}`,
      `Pitch: ${data.idea.pitch}`,
      `Difficulty: ${data.idea.difficulty}. Timeline: ${data.idea.timeline}. Domain: ${data.idea.domain}.`,
      data.context
        ? `Student skills: ${data.context.skills.join(", ")}. Time: ${data.context.timeAvailable}. Team: ${data.context.teamMode}.`
        : "",
      data.refinement ? `Student refinement request: ${data.refinement}` : "",
      "features: 5-7 concrete product features.",
      "stack: 6-10 specific technologies.",
      "roadmap: 7-10 ordered build steps, each with a short title and a one-sentence detail.",
      "uniquenessScore: 0-100 where 100 means rarely built before; uniquenessNote explains how common the idea already is.",
      "twist: one concrete way to make it stand out.",
      "improvements: 3-5 stretch goals.",
      "pitchScript: a 60-second spoken elevator pitch the student can say to their guide or panel.",
      "resumeLine: one strong resume bullet, under 200 characters.",
      "impactScore and learningCurve: 0-100 numbers.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = streamText({
        model: getMentorModel(),
        prompt,
        output: Output.object({ schema: breakdownSchema }),
      });
      return await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const fallback = parseFallback(error.text, breakdownSchema);
        if (fallback) return fallback;
      }
      throw new Error("The AI mentor could not build this plan right now.");
    }
  });
