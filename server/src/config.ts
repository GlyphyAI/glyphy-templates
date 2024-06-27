import dotenv from "dotenv";

dotenv.config();

export interface Config {
  port: number;
  templatePath: string;
  repoPath: string;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  templatePath: process.env.TEMPLATE_PATH ?? "/workspace/.glyphy/template.json",
  repoPath: process.env.REPO_PATH ?? "/workspace",
} satisfies Config;
