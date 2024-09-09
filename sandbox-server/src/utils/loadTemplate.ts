import fs from "fs";

import { templateSchema, type Template } from "~/models/template";

export function loadTemplate(workingDirectory: string, templatePath?: string): Template {
  const path = templatePath ?? `${workingDirectory}/.glyphy/template.json`;
  const templateContent = fs.readFileSync(path, "utf-8");
  const templateResult = templateSchema.safeParse(JSON.parse(templateContent));

  if (!templateResult.success) {
    throw templateResult.error;
  }

  return templateResult.data;
}
