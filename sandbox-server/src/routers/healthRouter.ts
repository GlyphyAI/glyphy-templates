import { Router, json as jsonParser } from "express";
import { asyncHandler } from "~/utils/asyncHandler";

export default class HealthRouter {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.router.use(jsonParser());
    this.routes();
  }

  private routes() {
    this.router.get(
      "/",
      asyncHandler(async (_req, res) => {
        res.json({ message: "Server is running!" });
      }),
    );
  }
}
