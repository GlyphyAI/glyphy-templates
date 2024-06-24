import { simpleGit } from "simple-git";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { SimpleGit, SimpleGitOptions } from "simple-git";

export interface IGitService {
  commit(message: string): Promise<void>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  createBranch(branch: string): Promise<void>;
  deleteBranch(branch: string): Promise<void>;
  switchBranch(branch: string): Promise<void>;
  publishBranch(branch: string, origin: string): Promise<void>;
  mergeBranches(branchToMerge: string, targetBranch: string): Promise<void>;
  listTags(): Promise<string[]>;
  tagCommit(tag: string, message?: string): Promise<void>;
  switchTag(tag: string): Promise<void>;
}

export class GitService implements IGitService {
  private git: SimpleGit;

  constructor(repoPath: string) {
    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      maxConcurrentProcesses: 6,
      config: [],
      trimmed: false,
    };

    this.git = simpleGit(options);
  }

  async commit(message: string): Promise<void> {
    try {
      await this.git.add(".");
      await this.git.commit(message);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async push(remote = "origin", branch = "main"): Promise<void> {
    try {
      await this.git.push(remote, branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async pull(remote = "origin", branch = "main"): Promise<void> {
    try {
      await this.git.pull(remote, branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async createBranch(branch: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async deleteBranch(branch: string): Promise<void> {
    try {
      await this.git.deleteLocalBranch(branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async switchBranch(branch: string): Promise<void> {
    try {
      await this.git.checkout(branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async publishBranch(branch: string, remote = "origin"): Promise<void> {
    try {
      await this.git.push(remote, branch);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async mergeBranches(branchToMerge: string, targetBranch: string): Promise<void> {
    try {
      await this.git.checkout(targetBranch);
      await this.git.merge([branchToMerge]);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async listTags(): Promise<string[]> {
    try {
      const tags = await this.git.tags();
      return tags.all;
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async tagCommit(tag: string, message = ""): Promise<void> {
    try {
      await this.git.addAnnotatedTag(tag, message);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async switchTag(tag: string): Promise<void> {
    try {
      await this.git.checkout(tag);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }
}
