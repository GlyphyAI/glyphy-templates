import dotenv from "dotenv";

dotenv.config();

export interface Config {
  port: number;
  repoPath: string;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  repoPath: process.env.REPO_PATH ?? "/workspace",
} satisfies Config;
