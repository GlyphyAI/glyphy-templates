import { Router } from "express";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IProcessService } from "~/services/processService";

class AppRouter {
  public router: Router;

  constructor(private processService: IProcessService) {
    this.router = Router();
    this.routes();
  }

  private routes() {
    this.router.post(
      "/app/start",
      asyncHandler(async (_req, res) => {
        await this.processService.startProcess();
        res.json({ message: "Process started" });
      }),
    );

    this.router.post(
      "/app/stop",
      asyncHandler(async (_req, res) => {
        await this.processService.stopProcess();
        res.json({ message: "Process stopped" });
      }),
    );

    this.router.post(
      "/app/reload",
      asyncHandler(async (_req, res) => {
        await this.processService.reloadProcess();
        res.json({ message: "Process reloaded" });
      }),
    );

    this.router.post(
      "/app/lint",
      asyncHandler(async (_req, res) => {
        const result = await this.processService.lint();
        res.json({ result });
      }),
    );

    this.router.post(
      "/app/format",
      asyncHandler(async (_req, res) => {
        const result = await this.processService.format();
        res.json({ result });
      }),
    );

    this.router.post(
      "/app/build-dependencies",
      asyncHandler(async (_req, res) => {
        const result = await this.processService.buildDependencies();
        res.json({ result });
      }),
    );
  }
}

export default AppRouter;
