import { Router } from "express";
import { z } from "zod";
import { TerminalService } from "~/services/terminalService";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { Request, Response } from "express";
import type { Broadcaster } from "~/utils/broadcaster";

const router = Router();
const terminalService = new TerminalService();

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

router.post("/terminals/create", (req: Request, res: Response) => {
  try {
    const broadcaster = req.app.get("broadcaster") as Broadcaster;
    const { id, shell } = createSchema.parse(req.body);

    terminalService.createTerminal(id, shell);

    // Broadcast terminal output (includes terminal ANSI symbols )
    terminalService.onTerminalOutput(id, (output) => {
      broadcaster.broadcast({ type: `terminal-${id}`, data: output });
    });

    // Broadcast terminal close (includes exit)
    terminalService.onTerminalClose(id, (exitCode) => {
      broadcaster.broadcast({
        type: `terminal-${id}`,
        data: `Terminal closed with code ${exitCode}`,
      });
    });

    res.json({ message: `Terminal ${id} created successfully` });
  } catch (error) {
    res.status(500).json({ message: unwrapErrorMessage(error) });
  }
});

router.delete("/terminals/delete", (req: Request, res: Response) => {
  try {
    const { id } = deleteSchema.parse(req.body);
    terminalService.deleteTerminal(id);
    res.json({ message: `Terminal ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: unwrapErrorMessage(error) });
  }
});

router.post("/terminals/send", (req: Request, res: Response) => {
  try {
    const { id, command } = sendSchema.parse(req.body);
    terminalService.sendCommand(id, command);
    res.json({ message: `Command sent to terminal ${id}` });
  } catch (error) {
    res.status(500).json({ message: unwrapErrorMessage(error) });
  }
});

export default router;
