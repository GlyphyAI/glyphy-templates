import { Router } from "express";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IAppService } from "~/services/appService";

export default class AppRouter {
  public readonly router: Router;

  constructor(private appService: IAppService) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.post(
      "/start",
      asyncHandler(async (req, res) => {
        try {
          const wait = req.query.wait === "true";
          const output = await this.appService.start({ wait, timeout: 10000 });
          const message = wait ? "App started and ready" : "App started";
          res.json({ message, output });
        } catch (error) {
          if (error instanceof Error) {
            res.status(500).json({ message: "App failed to start", error: error.message });
          } else {
            res.status(500).json({ message: "App failed to start", error });
          }
        }
      }),
    );

    this.router.post(
      "/stop",
      asyncHandler(async (req, res) => {
        try {
          const wait = req.query.wait === "true";
          const output = await this.appService.stop({ wait, timeout: 10000 });
          const message = wait ? "App stopped" : "App stopping";
          res.json({ message, output });
        } catch (error) {
          if (error instanceof Error) {
            res.status(500).json({ message: "App failed to stop", error: error.message });
          } else {
            res.status(500).json({ message: "App failed to stop", error });
          }
        }
      }),
    );

    this.router.post(
      "/reload",
      asyncHandler(async (req, res) => {
        try {
          const wait = req.query.wait === "true";
          const output = await this.appService.reload({ wait, timeout: 10000 });
          const message = wait ? "App reloaded and ready" : "App reloaded";
          res.json({ message, output });
        } catch (error) {
          if (error instanceof Error) {
            res.status(500).json({ message: "App failed to reload", error: error.message });
          } else {
            res.status(500).json({ message: "App failed to reload", error });
          }
        }
      }),
    );
  }
}
