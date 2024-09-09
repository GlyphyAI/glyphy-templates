import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";

import type { ICommandService } from "~/services/commandService";

const commandSchema = z.object({
  command: z.string().min(1),
});

export default class CommandRouter {
  public readonly router: Router;

  constructor(private commandService: ICommandService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/",
      asyncHandler(async (req, res) => {
        try {
          const { command } = commandSchema.parse(req.body);
          const result = await this.commandService.execute(command);
          res.json(result);
        } catch (error) {
          if (error instanceof Error) {
            res.status(400).json({ error: error.message });
          } else {
            res.status(400).json({ error });
          }
        }
      }),
    );
  }
}
