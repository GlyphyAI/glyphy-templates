import { Router } from "express";
import { ProcessService } from "~/services/processService";
import { asyncHandler } from "~/utils/asyncHandler";
import { loadTemplate } from "~/utils/loadTemplate";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { NextFunction, Request, Response } from "express";
import type { Broadcaster } from "~/utils/broadcaster";

const router = Router();
const template = loadTemplate();
const processService = new ProcessService(template.commands);

function injectBroadcaster(req: Request, _res: Response, next: NextFunction) {
  const broadcaster = req.app.get("broadcaster") as Broadcaster | undefined;
  if (!broadcaster) {
    throw new Error("Broadcaster is not available");
  }

  processService.setBroadcaster(broadcaster);
  next();
}

router.use(injectBroadcaster);

router.post("/app/start", (_req, res) => {
  try {
    processService.startProcess();
    res.json({ message: "Process started" });
  } catch (e) {
    res.status(500).json({ message: unwrapErrorMessage(e) });
  }
});

router.post("/app/stop", (_req, res) => {
  try {
    processService.stopProcess();
    res.json({ message: "Process stopped" });
  } catch (e) {
    res.status(500).json({ message: unwrapErrorMessage(e) });
  }
});

router.post("/app/reload", (_req, res) => {
  try {
    processService.reloadProcess();
    res.json({ message: "Process reloaded" });
  } catch (e) {
    res.status(500).json({ message: unwrapErrorMessage(e) });
  }
});

router.post(
  "/app/lint",
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await processService.lint();
    res.json({ result });
  }),
);

router.post(
  "/app/format",
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await processService.format();
    res.json({ result });
  }),
);

router.post(
  "/app/build-dependencies",
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await processService.buildDependencies();
    res.json({ result });
  }),
);

export default router;
