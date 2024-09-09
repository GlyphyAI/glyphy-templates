/* eslint-disable @typescript-eslint/unbound-method */

import { simpleGit } from "simple-git";
import { GitService } from "~/services/gitService";

import type {
  BranchSingleDeleteResult,
  CommitResult,
  MergeResult,
  PullResult,
  PushResult,
  Response,
  SimpleGit,
  TagResult,
} from "simple-git";

jest.mock("simple-git");

const mockSimpleGit = {
  add: jest.fn(),
  commit: jest.fn(),
  push: jest.fn(),
  pull: jest.fn(),
  checkoutLocalBranch: jest.fn(),
  deleteLocalBranch: jest.fn(),
  checkout: jest.fn(),
  merge: jest.fn(),
  tags: jest.fn(),
  addAnnotatedTag: jest.fn(),
} as unknown as jest.Mocked<SimpleGit>;

describe("GitService", () => {
  let gitService: GitService;

  beforeEach(() => {
    jest.clearAllMocks();
    (simpleGit as jest.Mock).mockReturnValue(mockSimpleGit);
    gitService = new GitService(mockSimpleGit);
  });

  test("commit should add and commit files", async () => {
    mockSimpleGit.add.mockResolvedValueOnce({} as unknown as string);
    mockSimpleGit.commit.mockResolvedValueOnce({} as CommitResult);

    await gitService.commit("test commit message");

    expect(mockSimpleGit.add).toHaveBeenCalledWith(".");
    expect(mockSimpleGit.commit).toHaveBeenCalledWith("test commit message");
  });

  test("commit should throw error if commit fails", async () => {
    const errorMessage = "commit error";
    mockSimpleGit.add.mockResolvedValueOnce({} as unknown as string);
    mockSimpleGit.commit.mockRejectedValueOnce(new Error(errorMessage));

    await expect(gitService.commit("test commit message")).rejects.toThrowError(errorMessage);
  });

  test("push should push to the remote branch", async () => {
    mockSimpleGit.push.mockResolvedValueOnce({} as PushResult);

    await gitService.push("origin", "main");

    expect(mockSimpleGit.push).toHaveBeenCalledWith("origin", "main");
  });

  test("pull should pull from the remote branch", async () => {
    mockSimpleGit.pull.mockResolvedValueOnce({} as PullResult);

    await gitService.pull("origin", "main");

    expect(mockSimpleGit.pull).toHaveBeenCalledWith("origin", "main");
  });

  test("createBranch should create a new branch", async () => {
    mockSimpleGit.checkoutLocalBranch.mockResolvedValueOnce({} as Response<void>);

    await gitService.createBranch("new-branch");

    expect(mockSimpleGit.checkoutLocalBranch).toHaveBeenCalledWith("new-branch");
  });

  test("deleteBranch should delete a branch", async () => {
    mockSimpleGit.deleteLocalBranch.mockResolvedValueOnce({} as BranchSingleDeleteResult);

    await gitService.deleteBranch("old-branch");

    expect(mockSimpleGit.deleteLocalBranch).toHaveBeenCalledWith("old-branch");
  });

  test("switchBranch should switch to a branch", async () => {
    mockSimpleGit.checkout.mockResolvedValueOnce({} as unknown as string);

    await gitService.switchBranch("feature-branch");

    expect(mockSimpleGit.checkout).toHaveBeenCalledWith("feature-branch");
  });

  test("publishBranch should push a branch to the remote", async () => {
    mockSimpleGit.push.mockResolvedValueOnce({} as PushResult);

    await gitService.publishBranch("feature-branch", "origin");

    expect(mockSimpleGit.push).toHaveBeenCalledWith("origin", "feature-branch");
  });

  test("mergeBranches should merge branches", async () => {
    mockSimpleGit.checkout.mockResolvedValueOnce({} as unknown as string);
    mockSimpleGit.merge.mockResolvedValueOnce({} as MergeResult);

    await gitService.mergeBranches("feature-branch", "main");

    expect(mockSimpleGit.checkout).toHaveBeenCalledWith("main");
    expect(mockSimpleGit.merge).toHaveBeenCalledWith(["feature-branch"]);
  });

  test("listTags should list all tags", async () => {
    mockSimpleGit.tags.mockResolvedValueOnce({
      all: ["v1.0", "v1.1"],
      latest: "v1.1",
    } as TagResult);

    const tags = await gitService.listTags();

    expect(tags).toEqual(["v1.0", "v1.1"]);
    expect(mockSimpleGit.tags).toHaveBeenCalled();
  });

  test("tagCommit should create a new tag", async () => {
    mockSimpleGit.addAnnotatedTag.mockResolvedValueOnce({} as { name: string });

    await gitService.tagCommit("v1.0", "initial release");

    expect(mockSimpleGit.addAnnotatedTag).toHaveBeenCalledWith("v1.0", "initial release");
  });

  test("switchTag should checkout a tag", async () => {
    mockSimpleGit.checkout.mockResolvedValueOnce({} as unknown as string);

    await gitService.switchTag("v1.0");

    expect(mockSimpleGit.checkout).toHaveBeenCalledWith("v1.0");
  });
});
