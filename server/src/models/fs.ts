import { z } from "zod";

const parseCommaSeparated = (val: unknown) => (typeof val === "string" ? val.split(",") : val);

export const listOptionsSchema = z.object({
  includePatterns: z.preprocess(parseCommaSeparated, z.array(z.string()).optional()),
  excludePatterns: z.preprocess(parseCommaSeparated, z.array(z.string()).optional()),
  recursive: z.preprocess((val) => val === "true", z.boolean().optional()),
});

export type ListOptions = z.infer<typeof listOptionsSchema>;
