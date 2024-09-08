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
    return this.processController.startAndWait({
      cmd: command,
      cwd: this.workingDirectory,
    });
  }
}
