import { Router } from "express";
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
  branchToMerge: z.string(),
  targetBranch: z.string(),
});

class GitRouter {
  public router: Router;

  constructor(private gitService: IGitService) {
    this.router = Router();
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
        const { remote, branch } = pushSchema.parse(req.body);
        await this.gitService.push(remote, branch);
        res.json({ message: "Push successful" });
      }),
    );

    this.router.post(
      "/pull",
      asyncHandler(async (req, res) => {
        const { remote, branch } = pushSchema.parse(req.body);
        await this.gitService.pull(remote, branch);
        res.json({ message: "Pull successful" });
      }),
    );

    this.router.post(
      "/branch/create",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.createBranch(branch);
        res.json({ message: `Branch ${branch} created successfully` });
      }),
    );

    this.router.post(
      "/branch/delete",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.deleteBranch(branch);
        res.json({ message: `Branch ${branch} deleted successfully` });
      }),
    );

    this.router.post(
      "/branch/switch",
      asyncHandler(async (req, res) => {
        const { branch } = branchSchema.parse(req.body);
        await this.gitService.switchBranch(branch);
        res.json({ message: `Switched to branch ${branch}` });
      }),
    );

    this.router.post(
      "/branch/publish",
      asyncHandler(async (req, res) => {
        const { branch, remote } = publishSchema.parse(req.body);
        await this.gitService.publishBranch(branch, remote);
        res.json({ message: `Branch ${branch} published successfully` });
      }),
    );

    this.router.post(
      "/branch/merge",
      asyncHandler(async (req, res) => {
        const { branchToMerge, targetBranch } = mergeSchema.parse(req.body);
        await this.gitService.mergeBranches(branchToMerge, targetBranch);
        res.json({ message: `Branch ${branchToMerge} merged into ${targetBranch} successfully` });
      }),
    );
  }
}

export default GitRouter;
