import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";

import type { ITerminalService } from "~/services/terminalService";
import type { Broadcaster } from "~/utils/broadcaster";

const createSchema = z.object({
  id: z.string(),
  shell: z.string().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

const sendSchema = z.object({
  id: z.string(),
  command: z.string(),
});

class TerminalRouter {
  public router: Router;

  constructor(
    private terminalService: ITerminalService,
    private broadcaster: Broadcaster,
  ) {
    this.router = Router();
    this.routes();
  }

  private routes() {
    this.router.post(
      "/terminals/create",
      asyncHandler(async (req, res) => {
        const { id, shell } = createSchema.parse(req.body);

        this.terminalService.createTerminal(id, shell);

        // Broadcast terminal output (includes terminal ANSI symbols )
        this.terminalService.onTerminalOutput(id, (output) => {
          this.broadcaster.broadcast({ type: `terminal-${id}`, data: output });
        });

        // Broadcast terminal close (includes exit)
        this.terminalService.onTerminalClose(id, (exitCode) => {
          this.broadcaster.broadcast({
            type: `terminal-${id}`,
            data: `Terminal closed with code ${exitCode}`,
          });
        });

        res.json({ message: `Terminal ${id} created successfully` });
      }),
    );

    this.router.delete(
      "/terminals/delete",
      asyncHandler(async (req, res) => {
        const { id } = deleteSchema.parse(req.body);
        this.terminalService.deleteTerminal(id);
        res.json({ message: `Terminal ${id} deleted successfully` });
      }),
    );

    this.router.post(
      "/terminals/send",
      asyncHandler(async (req, res) => {
        const { id, command } = sendSchema.parse(req.body);
        this.terminalService.sendCommand(id, command);
        res.json({ message: `Command sent to terminal ${id}` });
      }),
    );
  }
}

export default TerminalRouter;
