import simpleGit from "simple-git";
import { unwrapErrorMessage } from "~/utils/zodErrors";
import { GitService, type IGitService } from "./gitService";

export async function createGitService(repoPath: string): Promise<IGitService> {
  const git = simpleGit({
    baseDir: repoPath,
    maxConcurrentProcesses: 6,
    config: [],
    trimmed: false,
  });

  await setupGitConfig(git);

  return new GitService(git);
}

async function setupGitConfig(git: ReturnType<typeof simpleGit>) {
  try {
    await git.addConfig("user.name", "glyphyai-hub[bot]");
    await git.addConfig("user.email", "173952421+glyphyai-hub[bot]@users.noreply.github.com");
  } catch (error) {
    console.error("Failed to set up git config:", error);
    throw new Error(unwrapErrorMessage(error));
  }
}
