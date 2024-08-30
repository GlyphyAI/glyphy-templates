import simpleGit from "simple-git";
import { unwrapErrorMessage } from "~/utils/zodErrors";
import { GitService, type IGitService } from "./gitService";

export async function createGitService(
  repoPath: string,
  accessToken: string | null | undefined = null,
): Promise<IGitService> {
  const git = simpleGit({
    baseDir: repoPath,
    maxConcurrentProcesses: 6,
    config: [],
    trimmed: false,
  });

  await setupGitConfig(git, accessToken);

  return new GitService(git);
}

async function setupGitConfig(
  git: ReturnType<typeof simpleGit>,
  accessToken: string | null | undefined,
) {
  try {
    // Setup user credentials
    await git.addConfig("user.name", "glyphyai-hub[bot]");
    await git.addConfig("user.email", "173952421+glyphyai-hub[bot]@users.noreply.github.com");

    if (accessToken) {
      // Retrieve existing remotes
      const remotes = await git.getRemotes(true);
      const originRemote = remotes.find((remote) => remote.name === "origin");

      if (originRemote) {
        // Extract the existing remote URL
        const existingUrl = originRemote.refs.fetch;

        // Modify the URL to include the access token
        const newUrl = existingUrl.replace(
          "https://",
          `https://x-access-token:${encodeURIComponent(accessToken)}@`,
        );

        // Update the remote URL
        await git.remote(["set-url", "origin", newUrl]);
      } else {
        console.error("Remote 'origin' does not exist.");
      }
    }
  } catch (error) {
    console.error("Failed to set up git config:", error);
    throw new Error(unwrapErrorMessage(error));
  }
}
