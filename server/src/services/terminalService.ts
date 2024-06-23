import { EventEmitter } from "events";
import { spawn, type IPty } from "node-pty";

const nodeProcess = process;

type Terminal = {
  process: IPty;
  emitter: EventEmitter;
};

export interface ITerminalService {
  createTerminal(id: string, shell?: string): void;
  deleteTerminal(id: string): void;
  sendCommand(id: string, command: string): void;
  onTerminalOutput(id: string, listener: (output: string) => void): void;
  onTerminalClose(id: string, listener: (exitCode: number) => void): void;
}

export class TerminalService implements ITerminalService {
  private terminals = new Map<string, Terminal>();

  createTerminal(id: string, shell = "bash"): void {
    if (this.terminals.has(id)) {
      throw new Error(`Terminal with id ${id} already exists`);
    }

    const process = spawn(shell, [], {
      name: "xterm-color",
      cwd: nodeProcess.env.HOME,
      env: nodeProcess.env,
    });
    const emitter = new EventEmitter();

    process.onData((data: string) => {
      emitter.emit("output", data);
    });

    process.onExit(({ exitCode }) => {
      emitter.emit("close", exitCode);
      this.terminals.delete(id);
    });

    this.terminals.set(id, { process, emitter });
  }

  deleteTerminal(id: string): void {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      throw new Error(`Terminal with id ${id} does not exist`);
    }

    terminal.process.kill();
    this.terminals.delete(id);
  }

  sendCommand(id: string, command: string): void {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      throw new Error(`Terminal with id ${id} does not exist`);
    }

    terminal.process.write(`${command}\r`);
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
