import { isStderrMessage, isStdoutMessage } from "~/utils/process/processTypes";

import type { ProcessMessage } from "~/utils/process/processTypes";

export interface ProcessOutputJSON {
  stdout: string[];
  stderr: string[];
  exitCode: number | undefined;
  finished: boolean;
}

export class ProcessOutput {
  private readonly delimiter = "\n";
  private readonly messages: ProcessMessage[] = [];
  private _finished = false;
  private _exitCode?: number;

  get stdout(): string {
    JSON.stringify;
    return this.messages
      .filter(isStdoutMessage)
      .map((msg) => msg.message)
      .join(this.delimiter);
  }

  get stderr(): string {
    return this.messages
      .filter(isStderrMessage)
      .map((msg) => msg.message)
      .join(this.delimiter);
  }

  get exitCode(): number | undefined {
    return this._exitCode;
  }

  get running(): boolean {
    return !this._finished;
  }

  get finished(): boolean {
    return this._finished;
  }

  addMessage(type: ProcessMessage["type"], message: string): void {
    if (type === "exit") {
      this.messages.push({ type, exitCode: parseInt(message) });
    } else {
      this.messages.push({ type, message });
    }
  }

  finish(exitCode?: number): void {
    this._exitCode = exitCode;
    this._finished = true;
  }

  toJSON(): ProcessOutputJSON {
    return {
      stdout: this.messages.filter(isStdoutMessage).map((msg) => msg.message),
      stderr: this.messages.filter(isStderrMessage).map((msg) => msg.message),
      exitCode: this.exitCode,
      finished: this.finished,
    };
  }
}
