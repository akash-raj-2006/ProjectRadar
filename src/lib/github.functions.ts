import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RepoMatch = {
  query: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  language: string;
} | null;

const inputSchema = z.object({
  query: z.string().min(3).max(120),
});

/**
 * Finds the most relevant public GitHub repository for a project idea so the
 * student can study prior art before building.
 */
export const findReferenceRepo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<RepoMatch> => {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", `${data.query} in:name,description`);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("per_page", "1");

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ProjectRadar",
        },
      });
      if (!response.ok) {
        throw new Error(`GitHub search failed with status ${response.status}`);
      }
      const body = (await response.json()) as {
        items?: Array<{
          full_name: string;
          html_url: string;
          description: string | null;
          stargazers_count: number;
          language: string | null;
        }>;
      };
      const item = body.items?.[0];
      if (!item) return null;
      return {
        query: data.query,
        fullName: item.full_name,
        url: item.html_url,
        description: item.description ?? "No description provided.",
        stars: item.stargazers_count,
        language: item.language ?? "Unknown",
      };
    } catch {
      throw new Error("Could not reach GitHub right now. Please try again.");
    }
  });
