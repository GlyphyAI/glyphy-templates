import { spawn, type IPty } from "node-pty";
import { TerminalError } from "~/errors";

import type { EventEmitter } from "events";

const nodeProcess = process;

type Terminal = {
  process: IPty;
  emitter: EventEmitter;
};

export interface ITerminalService {
  listTerminals(): string[];
  getTerminal(id: string): Terminal | undefined;
  createTerminal(id: string, shell?: string): void;
  deleteTerminal(id: string): void;
  sendCommand(id: string, command: string): void;
  onTerminalOutput(id: string, listener: (output: string) => void): void;
  onTerminalClose(id: string, listener: (exitCode: number) => void): void;
}

export class TerminalService implements ITerminalService {
  private terminals = new Map<string, Terminal>();

  constructor(private emitter: EventEmitter) {}

  listTerminals(): string[] {
    return Array.from(this.terminals.keys());
  }

  getTerminal(id: string): Terminal | undefined {
    return this.terminals.get(id);
  }

  createTerminal(id: string, shell = "bash"): void {
    try {
      if (this.terminals.has(id)) {
        throw new Error(`Terminal with id ${id} already exists`);
      }

      const process = spawn(shell, [], {
        name: "xterm-color",
        cwd: nodeProcess.env.HOME,
        env: nodeProcess.env,
      });

      process.onData((data: string) => {
        this.emitter.emit("output", data);
      });

      process.onExit(({ exitCode }) => {
        this.emitter.emit("close", exitCode);
        this.terminals.delete(id);
      });

      this.terminals.set(id, { process, emitter: this.emitter });
    } catch (error) {
      throw TerminalError.fromError(error, {
        defaultErrorCode: "TERMINAL_CREATE_ERROR",
        defaultErrorMessage: "Failed to create terminal",
        additionalDetails: { id, shell },
      });
    }
  }

  deleteTerminal(id: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        throw new Error(`Terminal with id ${id} does not exist`);
      }

      terminal.process.kill();
      this.terminals.delete(id);
    } catch (error) {
      throw TerminalError.fromError(error, {
        defaultErrorCode: "TERMINAL_DELETE_ERROR",
        defaultErrorMessage: "Failed to delete terminal",
        additionalDetails: { id },
      });
    }
  }

  sendCommand(id: string, command: string): void {
    try {
      const terminal = this.terminals.get(id);
      if (!terminal) {
        throw new Error(`Terminal with id ${id} does not exist`);
      }

      terminal.process.write(`${command}\r`);
    } catch (error) {
      throw TerminalError.fromError(error, {
        defaultErrorCode: "TERMINAL_SEND_COMMAND_ERROR",
        defaultErrorMessage: "Failed to send command to terminal",
        additionalDetails: { id, command },
      });
    }
  }

  onTerminalOutput(id: string, listener: (output: string) => void): void {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      throw new Error(`Terminal with id ${id} does not exist`);
    }

    terminal.emitter.on("output", listener);
  }

  onTerminalClose(id: string, listener: (exitCode: number) => void): void {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      throw new Error(`Terminal with id ${id} does not exist`);
    }

    terminal.emitter.on("close", listener);
  }
}
