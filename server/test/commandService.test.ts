/* eslint-disable @typescript-eslint/unbound-method */

import { CommandService } from "~/services/commandService";
import type { IProcessController, ProcessOutput } from "~/utils/process";

describe("CommandService", () => {
  let mockProcessController: jest.Mocked<IProcessController>;
  let commandService: CommandService;
  const workingDirectory = "/test/directory";

  beforeEach(() => {
    mockProcessController = {
      startAndWait: jest.fn(),
    } as unknown as jest.Mocked<IProcessController>;

    commandService = new CommandService({
      workingDirectory,
      processController: mockProcessController,
    });
  });

  it("should create an instance of CommandService", () => {
    expect(commandService).toBeInstanceOf(CommandService);
  });

  it("should execute a command using the process controller", async () => {
    const command = "test command";
    const expectedOutput: Partial<ProcessOutput> = {
      stdout: "test output",
      stderr: "",
      exitCode: 0,
      running: false,
      finished: true,
    };

    mockProcessController.startAndWait.mockResolvedValue(expectedOutput as ProcessOutput);

    const result = await commandService.execute(command);

    expect(mockProcessController.startAndWait).toHaveBeenCalledWith({
      cmd: command,
      cwd: workingDirectory,
    });
    expect(result).toEqual(expectedOutput);
  });

  it("should throw an error if the process controller throws", async () => {
    const command = "error command";
    const expectedError = new Error("Process failed");

    mockProcessController.startAndWait.mockRejectedValue(expectedError);

    await expect(commandService.execute(command)).rejects.toThrow(expectedError);
  });
});
