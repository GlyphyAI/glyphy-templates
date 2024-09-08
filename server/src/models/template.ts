import { z } from "zod";

export const templateSchema = z
  .object({
    previews: z.object({
      enabled: z.boolean(),
      web: z.object({ command: z.string() }).optional(),
    }),
    commands: z.object({
      start: z.string().optional(),
      lint: z.string().optional(),
      format: z.string().optional(),
      install: z.string().optional(),
    }),
  })
  .passthrough();

export type Template = z.infer<typeof templateSchema>;

export type PreviewsTemplate = Template["previews"];

export type CommandsTemplate = Template["commands"];
