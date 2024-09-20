import { Router, json as jsonParser } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IGitService } from "~/services/gitService";

const commitSchema = z.object({
  message: z.string(),
});

const branchSchema = z.object({
  branch: z.string(),
});

const pushSchema = z.object({
  branch: z.string(),
  remote: z.string().default("origin"),
});

const publishSchema = z.object({
  branch: z.string(),
  remote: z.string().default("origin"),
});

const mergeSchema = z.object({
  sourceBranch: z.string(),
  destinationBranch: z.string(),
});

const tagSchema = z.object({
  tag: z.string(),
  message: z.string(),
});

export default class GitRouter {
  public readonly router: Router;

  constructor(private gitService: IGitService) {
    this.router = Router();
    this.router.use(jsonParser());
    this.routes();
  }

  private routes() {
    this.router.post(
      "/commit",
      asyncHandler(async (req, res) => {
        const { message } = commitSchema.parse(req.body);
        await this.gitService.commit(message);
        res.json({ message: "Commit successful" });
      }),
    );

    this.router.post(
      "/push",
      asyncHandler(async (req, res) => {
        const { branch, remote } = pushSchema.parse(req.body);
        await this.gitService.push(remote, branch);
        res.json({ message: "Push successful" });
      }),
    );

    this.router.post(
      "/pull",
      asyncHandler(async (req, res) => {
        const { branch, remote } = pushSchema.parse(req.body);
        await this.gitService.pull(remote, branch);
        res.json({ message: "Pull successful" });
      }),
    );

    this.router.post(
      "/branches/create",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.createBranch(branch);
        res.json({ message: `Branch ${branch} created successfully` });
      }),
    );

    this.router.post(
      "/branches/delete",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.deleteBranch(branch);
        res.json({ message: `Branch ${branch} deleted successfully` });
      }),
    );

    this.router.post(
      "/branches/switch",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.switchBranch(branch);
        res.json({ message: `Switched to branch ${branch}` });
      }),
    );

    this.router.post(
      "/branches/publish",
      asyncHandler(async (req, res) => {
        const { branch, remote } = publishSchema.parse(req.body);
        await this.gitService.publishBranch(branch, remote);
        res.json({ message: `Branch ${branch} published successfully` });
      }),
    );

    this.router.post(
      "/branches/merge",
      asyncHandler(async (req, res) => {
        const { sourceBranch, destinationBranch } = mergeSchema.parse(req.body);
        await this.gitService.mergeBranches(sourceBranch, destinationBranch, true);
        res.json({
          message: `Branch ${sourceBranch} merged into ${destinationBranch} successfully`,
        });
      }),
    );

    this.router.get(
      "/tags",
      asyncHandler(async (req, res) => {
        const tags = await this.gitService.listTags();
        res.json({ tags });
      }),
    );

    this.router.post(
      "/tags/create",
      asyncHandler(async (req, res) => {
        const { tag, message } = tagSchema.parse(req.body);
        await this.gitService.tagCommit(tag, message);
        res.json({ message: `Tag ${tag} created successfully` });
      }),
    );

    this.router.post(
      "/tags/switch",
      asyncHandler(async (req, res) => {
        const { tag } = z.object({ tag: z.string() }).parse(req.body);
        await this.gitService.switchTag(tag);
        res.json({ message: `Switched to tag ${tag}` });
      }),
    );
  }
}
