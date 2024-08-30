import { z } from "zod";

export const templateSchema = z
  .object({
    commands: z.object({
      start: z.string().optional(),
      lint: z.string().optional(),
      format: z.string().optional(),
      install: z.string().optional(),
    }),
  })
  .passthrough();

export type Template = z.infer<typeof templateSchema>;

export type CommandsTemplate = Template["commands"];
