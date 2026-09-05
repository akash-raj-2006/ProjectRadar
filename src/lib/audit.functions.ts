import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AuditReport } from "./audit.server";
import type { RemoteReport } from "./remote-audit.server";

export type { AuditReport, Finding } from "./audit.server";
export type { RemoteReport } from "./remote-audit.server";

export const runRepoAudit = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuditReport> => {
    const { runAudit } = await import("./audit.server");
    return runAudit();
  },
);

const remoteInput = z.object({
  repo: z.string().min(3, "Enter a GitHub repository URL").max(200),
});

export const scanGithubRepo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => remoteInput.parse(input))
  .handler(async ({ data }): Promise<RemoteReport> => {
    const { scanRemoteRepo } = await import("./remote-audit.server");
    return scanRemoteRepo(data.repo);
  });
