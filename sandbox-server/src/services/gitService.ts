import { GitError } from "~/errors";

import type { SimpleGit } from "simple-git";

export interface IGitService {
  commit(message: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  createBranch(branch: string): Promise<void>;
  deleteBranch(branch: string): Promise<void>;
  switchBranch(branch: string): Promise<void>;
  publishBranch(branch: string, origin: string): Promise<void>;
  mergeBranches(
    sourceBranch: string,
    destinationBranch: string,
    pushAfterMerge: boolean,
  ): Promise<void>;
  listTags(): Promise<string[]>;
  tagCommit(tag: string, message?: string): Promise<void>;
  switchTag(tag: string): Promise<void>;
}

export class GitService implements IGitService {
  constructor(private git: SimpleGit) {}

  async commit(message: string): Promise<void> {
    try {
      await this.git.add(".");
      await this.git.commit(message);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_COMMIT_ERROR",
        defaultErrorMessage: "Failed to commit changes",
        additionalDetails: { message },
      });
    }
  }

  async push(remote = "origin", branch = "main"): Promise<void> {
    try {
      await this.git.push(remote, branch);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_PUSH_ERROR",
        defaultErrorMessage: "Failed to push changes",
        additionalDetails: { remote, branch },
      });
    }
  }

  async pull(remote = "origin", branch = "main"): Promise<void> {
    try {
      await this.git.pull(remote, branch);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_PULL_ERROR",
        defaultErrorMessage: "Failed to pull changes",
        additionalDetails: { remote, branch },
      });
    }
  }

  async createBranch(branch: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branch);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_CREATE_BRANCH_ERROR",
        defaultErrorMessage: "Failed to create branch",
        additionalDetails: { branch },
      });
    }
  }

  async deleteBranch(branch: string): Promise<void> {
    try {
      await this.git.deleteLocalBranch(branch);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_DELETE_BRANCH_ERROR",
        defaultErrorMessage: "Failed to delete branch",
        additionalDetails: { branch },
      });
    }
  }

  async switchBranch(branch: string): Promise<void> {
    try {
      await this.git.checkout(branch);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_SWITCH_BRANCH_ERROR",
        defaultErrorMessage: "Failed to switch branch",
        additionalDetails: { branch },
      });
    }
  }

  async publishBranch(branch: string, remote = "origin"): Promise<void> {
    try {
      await this.git.push(["-u", remote, `${branch}:${branch}`]);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_PUBLISH_BRANCH_ERROR",
        defaultErrorMessage: "Failed to publish branch",
        additionalDetails: { branch, remote },
      });
    }
  }

  async mergeBranches(
    sourceBranch: string,
    destinationBranch: string,
    pushAfterMerge = true,
  ): Promise<void> {
    const originalBranch = await this.git.revparse(["--abbrev-ref", "HEAD"]);

    try {
      await this.git.checkout(destinationBranch);
      await this.git.merge([sourceBranch]);

      if (pushAfterMerge) {
        await this.git.push("origin", destinationBranch);
      }
    } catch (error) {
      try {
        await this.git.merge(["--abort"]);
      } catch (abortError) {
        console.error("Failed to abort merge", abortError);
      }

      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_MERGE_BRANCHES_ERROR",
        defaultErrorMessage: "Failed to merge branches",
        additionalDetails: { sourceBranch, destinationBranch },
      });
    } finally {
      try {
        await this.git.checkout(originalBranch);
      } catch (checkoutError) {
        console.error("Failed to return to original branch:", checkoutError);
      }
    }
  }

  async listTags(): Promise<string[]> {
    try {
      const tags = await this.git.tags();
      return tags.all;
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_LIST_TAGS_ERROR",
        defaultErrorMessage: "Failed to list tags",
      });
    }
  }

  async tagCommit(tag: string, message = ""): Promise<void> {
    try {
      await this.git.addAnnotatedTag(tag, message);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_TAG_COMMIT_ERROR",
        defaultErrorMessage: "Failed to tag commit",
        additionalDetails: { tag, message },
      });
    }
  }

  async switchTag(tag: string): Promise<void> {
    try {
      await this.git.checkout(tag);
    } catch (error) {
      throw GitError.fromError(error, {
        defaultErrorCode: "GIT_SWITCH_TAG_ERROR",
        defaultErrorMessage: "Failed to switch to tag",
        additionalDetails: { tag },
      });
    }
  }
}
