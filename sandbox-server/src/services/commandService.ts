import type { IProcessController, ProcessOutput } from "~/utils/process";

interface CommandServiceOptions {
  workingDirectory: string;
  processController: IProcessController;
}

export interface ICommandService {
  execute(command: string): Promise<ProcessOutput>;
}

export class CommandService implements ICommandService {
  private readonly workingDirectory: string;
  private readonly processController: IProcessController;

  constructor({ workingDirectory, processController }: CommandServiceOptions) {
    this.workingDirectory = workingDirectory;
    this.processController = processController;
  }

  async execute(command: string): Promise<ProcessOutput> {
    const result = await this.processController.startAndWait({
      cmd: command,
      cwd: this.workingDirectory,
    });

    if (!result.finished) {
      if (result.timeout) {
        throw new Error("Command timed out");
      } else if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}`);
      } else {
        throw new Error("Command failed");
      }
    }

    return result.output;
  }
}
