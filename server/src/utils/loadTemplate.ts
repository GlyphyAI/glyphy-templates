import fs from "fs";
import { type Config } from "~/config";
import { templateSchema, type Template } from "~/models/template";

export function loadTemplate(config: Config): Template {
  const templateContent = fs.readFileSync(config.templatePath, "utf-8");
  const templateResult = templateSchema.safeParse(JSON.parse(templateContent));

  if (!templateResult.success) {
    throw templateResult.error;
  }

  return templateResult.data;
}
