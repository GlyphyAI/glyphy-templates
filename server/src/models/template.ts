import { z } from "zod";

export const templateSchema = z
  .object({
    commands: z.object({
      startCommand: z.string(),
      lintCommand: z.string().optional(),
      formatCommand: z.string().optional(),
      buildDependenciesCommand: z.string().optional(),
      workingDirectory: z.string(),
      startOnInitialize: z.boolean().default(false),
    }),
  })
  .passthrough();

export type Template = z.infer<typeof templateSchema>;

export type CommandsTemplate = Template["commands"];
