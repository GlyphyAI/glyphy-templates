import { Router, json as jsonParser } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";
import { coerceBoolean } from "~/utils/zod";

import type { IAppService } from "~/services/appService";

const waitOptionsSchema = z.object({
  wait: coerceBoolean.optional(),
  timeout: z.coerce.number().optional(),
});

export default class AppRouter {
  public readonly router: Router;

  constructor(private appService: IAppService) {
    this.router = Router();
    this.router.use(jsonParser());
    this.routes();
  }

  private routes() {
    this.router.get(
      "/status",
      asyncHandler(async (_req, res) => {
        const status = await this.appService.status();
        res.json({ status });
      }),
    );

    this.router.post(
      "/start",
      asyncHandler(async (req, res) => {
        const options = waitOptionsSchema.parse(req.query);
        const output = await this.appService.start(options);
        const message = options.wait ? "App started and ready" : "App started";
        res.json({ message, output });
      }),
    );

    this.router.post(
      "/stop",
      asyncHandler(async (req, res) => {
        const options = waitOptionsSchema.parse(req.query);
        const output = await this.appService.stop(options);
        const message = options.wait ? "App stopped" : "App stopping";
        res.json({ message, output });
      }),
    );

    this.router.post(
      "/reload",
      asyncHandler(async (req, res) => {
        const options = waitOptionsSchema.parse(req.query);
        const output = await this.appService.reload(options);
        const message = options.wait ? "App reloaded and ready" : "App reloaded";
        res.json({ message, output });
      }),
    );
  }
}
