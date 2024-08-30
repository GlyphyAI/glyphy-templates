import { Router } from "express";
import { asyncHandler } from "~/utils/asyncHandler";

class HealthRouter {
  public router: Router;

  constructor() {
    this.router = Router();
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

export default HealthRouter;
