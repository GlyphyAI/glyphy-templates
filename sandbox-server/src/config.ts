import dotenv from "dotenv";

import { z } from "zod";
import { coerceBoolean } from "~/utils/zod";

const configSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535),
  workingDirectory: z.string().min(1),
  templatePath: z.string().optional(),
  appStartOnBoot: coerceBoolean,
  appStartTimeout: z.coerce.number().min(1).max(600000),
  appStartAwait: coerceBoolean,
  appRuntime: z.enum(["flutter", "dart"]),
});

export type Config = z.infer<typeof configSchema>;

function readConfig() {
  try {
    dotenv.config();

    return configSchema.parse({
      port: process.env.PORT ?? 3000,
      workingDirectory: process.env.WORKING_DIRECTORY,
      templatePath: process.env.TEMPLATE_PATH ?? undefined,
      appStartOnBoot: process.env.APP_START_ON_BOOT ?? true,
      appStartTimeout: process.env.APP_START_TIMEOUT ?? 60000,
      appStartAwait: process.env.APP_START_AWAIT ?? true,
      appRuntime: process.env.APP_RUNTIME ?? "flutter",
    });
  } catch (error) {
    console.error("Config validation failed", error);
    process.exit(1);
  }
}

export const config = readConfig();
