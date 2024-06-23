import fs from "fs";
import { templateSchema, type Template } from "~/models/template";

export function loadTemplate(): Template {
  const templatePath = process.env.TEMPLATE_PATH ?? "/workspace/.glyphy/template.json";
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const templateResult = templateSchema.safeParse(JSON.parse(templateContent));

  if (!templateResult.success) {
    throw templateResult.error;
  }

  return templateResult.data;
}
