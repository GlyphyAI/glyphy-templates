/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import GitRouter from "~/routers/gitRouter";

import { z } from "zod";

import type { IGitService } from "~/services/gitService";

const mockGitService: jest.Mocked<IGitService> = {
  commit: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockResolvedValue(undefined),
  pull: jest.fn().mockResolvedValue(undefined),
  createBranch: jest.fn().mockResolvedValue(undefined),
  deleteBranch: jest.fn().mockResolvedValue(undefined),
  switchBranch: jest.fn().mockResolvedValue(undefined),
  publishBranch: jest.fn().mockResolvedValue(undefined),
  mergeBranches: jest.fn().mockResolvedValue(undefined),
  listTags: jest.fn().mockResolvedValue(["v1.0", "v1.1"]),
  tagCommit: jest.fn().mockResolvedValue(undefined),
  switchTag: jest.fn().mockResolvedValue(undefined),
};

const messageResponseSchema = z.object({
  message: z.string(),
});

const tagsResponseSchema = z.object({
  tags: z.array(z.string()),
});

describe("GitRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const gitRouter = new GitRouter(mockGitService);
    app.use("/api/git", gitRouter.router);
  });

  test("POST /commit should commit changes", async () => {
    const response = await request(app)
      .post("/api/git/commit")
      .send({ message: "test commit message" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Commit successful");
    expect(mockGitService.commit).toHaveBeenCalledWith("test commit message");
  });

  test("POST /push should push changes to remote branch", async () => {
    const response = await request(app)
      .post("/api/git/push")
      .send({ branch: "main", remote: "origin" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Push successful");
    expect(mockGitService.push).toHaveBeenCalledWith("origin", "main");
  });

  test("POST /pull should pull changes from remote branch", async () => {
    const response = await request(app)
      .post("/api/git/pull")
      .send({ branch: "main", remote: "origin" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Pull successful");
    expect(mockGitService.pull).toHaveBeenCalledWith("origin", "main");
  });

  test("POST /branches/create should create a new branch", async () => {
    const response = await request(app)
      .post("/api/git/branches/create")
      .send({ branch: "new-branch" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Branch new-branch created successfully");
    expect(mockGitService.createBranch).toHaveBeenCalledWith("new-branch");
  });

  test("POST /branches/delete should delete a branch", async () => {
    const response = await request(app)
      .post("/api/git/branches/delete")
      .send({ branch: "old-branch" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Branch old-branch deleted successfully");
    expect(mockGitService.deleteBranch).toHaveBeenCalledWith("old-branch");
  });

  test("POST /branches/switch should switch to a branch", async () => {
    const response = await request(app)
      .post("/api/git/branches/switch")
      .send({ branch: "feature-branch" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Switched to branch feature-branch");
    expect(mockGitService.switchBranch).toHaveBeenCalledWith("feature-branch");
  });

  test("POST /branches/publish should publish a branch", async () => {
    const response = await request(app)
      .post("/api/git/branches/publish")
      .send({ branch: "feature-branch", remote: "origin" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Branch feature-branch published successfully");
    expect(mockGitService.publishBranch).toHaveBeenCalledWith("feature-branch", "origin");
  });

  test("POST /branches/merge should merge branches", async () => {
    const response = await request(app)
      .post("/api/git/branches/merge")
      .send({ sourceBranch: "feature-branch", destinationBranch: "main" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Branch feature-branch merged into main successfully");
    expect(mockGitService.mergeBranches).toHaveBeenCalledWith("feature-branch", "main", true);
  });

  test("GET /tag should list all tags", async () => {
    const response = await request(app).get("/api/git/tags");

    expect(response.status).toBe(200);
    const parsedResponse = tagsResponseSchema.parse(response.body);
    expect(parsedResponse.tags).toEqual(["v1.0", "v1.1"]);
    expect(mockGitService.listTags).toHaveBeenCalled();
  });

  test("POST /tags/create should create a new tag", async () => {
    const response = await request(app)
      .post("/api/git/tags/create")
      .send({ tag: "v1.0", message: "initial release" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Tag v1.0 created successfully");
    expect(mockGitService.tagCommit).toHaveBeenCalledWith("v1.0", "initial release");
  });

  test("POST /tags/switch should switch to a tag", async () => {
    const response = await request(app).post("/api/git/tags/switch").send({ tag: "v1.0" });

    expect(response.status).toBe(200);
    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Switched to tag v1.0");
    expect(mockGitService.switchTag).toHaveBeenCalledWith("v1.0");
  });
});
