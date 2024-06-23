import { Router } from "express";
import { z } from "zod";
import { GitService } from "~/services/gitService";
import { asyncHandler } from "~/utils/asyncHandler";

import type { Request, Response } from "express";

const router = Router();
const repoPath = process.env.REPO_PATH ?? "/workspace";
const gitService = new GitService(repoPath);

const commitSchema = z.object({
  message: z.string(),
});

const branchSchema = z.object({
  branch: z.string(),
});

const publishSchema = z.object({
  branch: z.string(),
  remote: z.string().optional(),
});

const mergeSchema = z.object({
  branchToMerge: z.string(),
  targetBranch: z.string(),
});

router.post(
  "/git/commit",
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = commitSchema.parse(req.body);
    await gitService.commit(message);
    res.json({ message: "Commit successful" });
  }),
);

router.post(
  "/git/push",
  asyncHandler(async (req: Request, res: Response) => {
    const { remote = "origin", branch = "main" } = req.query;
    await gitService.push(remote as string, branch as string);
    res.json({ message: "Push successful" });
  }),
);

router.post(
  "/git/pull",
  asyncHandler(async (req: Request, res: Response) => {
    const { remote = "origin", branch = "main" } = req.query;
    await gitService.pull(remote as string, branch as string);
    res.json({ message: "Pull successful" });
  }),
);

router.post(
  "/git/branch/create",
  asyncHandler(async (req: Request, res: Response) => {
    const { branch } = branchSchema.parse(req.body);
    await gitService.createBranch(branch);
    res.json({ message: `Branch ${branch} created successfully` });
  }),
);

router.post(
  "/git/branch/delete",
  asyncHandler(async (req: Request, res: Response) => {
    const { branch } = branchSchema.parse(req.body);
    await gitService.deleteBranch(branch);
    res.json({ message: `Branch ${branch} deleted successfully` });
  }),
);

router.post(
  "/git/branch/switch",
  asyncHandler(async (req: Request, res: Response) => {
    const { branch } = branchSchema.parse(req.body);
    await gitService.switchBranch(branch);
    res.json({ message: `Switched to branch ${branch}` });
  }),
);

router.post(
  "/git/branch/publish",
  asyncHandler(async (req: Request, res: Response) => {
    const { branch, remote } = publishSchema.parse(req.body);
    await gitService.publishBranch(branch, remote);
    res.json({ message: `Branch ${branch} published successfully` });
  }),
);

router.post(
  "/git/branch/merge",
  asyncHandler(async (req: Request, res: Response) => {
    const { branchToMerge, targetBranch } = mergeSchema.parse(req.body);
    await gitService.mergeBranches(branchToMerge, targetBranch);
    res.json({ message: `Branch ${branchToMerge} merged into ${targetBranch} successfully` });
  }),
);

export default router;
