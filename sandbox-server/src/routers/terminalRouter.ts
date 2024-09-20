import { Router, json as jsonParser } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";

import type { ITerminalService } from "~/services/terminalService";
import type { IBroadcaster } from "~/utils/broadcaster";

const createSchema = z.object({
  id: z.string(),
  shell: z.string().optional(),
});

const getDeleteSchema = z.object({
  id: z.string(),
});

const sendSchema = z.object({
  id: z.string(),
  command: z.string(),
});

export default class TerminalRouter {
  public readonly router: Router;

  constructor(
    private terminalService: ITerminalService,
    private broadcaster: IBroadcaster,
  ) {
    this.router = Router();
    this.router.use(jsonParser());
    this.routes();
  }

  private routes() {
    this.router.get(
      "/list",
      asyncHandler(async (_req, res) => {
        const terminals = this.terminalService.listTerminals();
        res.json({ terminals });
      }),
    );

    this.router.get(
      "/get",
      asyncHandler(async (req, res) => {
        const { id } = getDeleteSchema.parse(req.query);
        const terminal = this.terminalService.getTerminal(id);
        res.json({ terminal });
      }),
    );

    this.router.post(
      "/create",
      asyncHandler(async (req, res) => {
        const { id, shell } = createSchema.parse(req.body);

        this.terminalService.createTerminal(id, shell);

        // Broadcast terminal output (includes terminal ANSI symbols )
        this.terminalService.onTerminalOutput(id, (output) => {
          this.broadcaster.broadcast({
            event: "terminal:stdout",
            params: { terminalId: id, data: output },
          });
        });

        // Broadcast terminal close (includes exit)
        this.terminalService.onTerminalClose(id, (exitCode) => {
          this.broadcaster.broadcast({
            event: "terminal:exit",
            params: { terminalId: id, code: exitCode },
          });
        });

        res.json({ message: `Terminal ${id} created successfully` });
      }),
    );

    this.router.delete(
      "/delete",
      asyncHandler(async (req, res) => {
        const { id } = getDeleteSchema.parse(req.body);
        this.terminalService.deleteTerminal(id);
        res.json({ message: `Terminal ${id} deleted successfully` });
      }),
    );

    this.router.post(
      "/send",
      asyncHandler(async (req, res) => {
        const { id, command } = sendSchema.parse(req.body);
        this.terminalService.sendCommand(id, command);
        res.json({ message: `Command sent to terminal ${id}` });
      }),
    );
  }
}
