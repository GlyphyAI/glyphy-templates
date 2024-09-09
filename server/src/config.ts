import dotenv from "dotenv";
import { z } from "zod";

const configSchema = z.object({
  port: z.preprocess((val) => parseInt(val as string, 10), z.number().min(1).max(65535)),
  workingDirectory: z.string().min(1),
  templatePath: z.string().optional(),
  initAppOnBoot: z.preprocess((val) => val === "true", z.boolean().default(true)),
  processRuntime: z.enum(["flutter", "dart"]),
});

export type Config = z.infer<typeof configSchema>;

function readConfig() {
  try {
    dotenv.config();

    return configSchema.parse({
      port: process.env.PORT ?? 3000,
      workingDirectory: process.env.WORKING_DIRECTORY,
      templatePath: process.env.TEMPLATE_PATH,
      initAppOnBoot: process.env.INIT_APP_ON_BOOT,
      processRuntime: process.env.PROCESS_RUNTIME,
    });
  } catch (error) {
    console.error("Config validation failed", error);
    process.exit(1);
  }
}

export const config = readConfig();
