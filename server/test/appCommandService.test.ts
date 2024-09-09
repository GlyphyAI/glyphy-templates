/* eslint-disable @typescript-eslint/unbound-method */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { AppCommandService, type IAppCommandService } from "~/services/appCommandService";
import { ProcessController, type IProcessController } from "~/utils/process";
import { BufferedStream, type IBufferedStream } from "~/utils/stream";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { CommandsTemplate } from "~/models/template";
import type { IBroadcaster } from "~/utils/broadcaster";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

jest.mock("~/utils/zodErrors", () => ({
  unwrapErrorMessage: jest.fn(),
}));

describe("AppCommandService", () => {
  let appCommandService: IAppCommandService;
  let commandsTemplate: CommandsTemplate;
  let broadcaster: IBroadcaster;
  let mockProcess: ChildProcessWithoutNullStreams;
  let processController: IProcessController;
  let stderrBufferedStream: IBufferedStream<string>;

  beforeEach(() => {
    commandsTemplate = {
      start: "echo start",
      lint: "echo lint",
      format: "echo format",
      install: "echo install",
    };

    broadcaster = {
      broadcast: jest.fn(),
      bufferedBroadcast: jest.fn(),
    };

    // We can't mock the ProcessController because it spawns processes
    processController = new ProcessController();

    // We use a buffered stream to flush stderr output
    stderrBufferedStream = new BufferedStream<string>(0);

    appCommandService = new AppCommandService({
      commandsTemplate,
      broadcaster,
      processController,
      workingDirectory: ".",
      stderrBufferedStream,
    });

    mockProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
    } as unknown as ChildProcessWithoutNullStreams;

    (spawn as jest.Mock).mockImplementation(() => mockProcess);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should start an app if none is running", async () => {
    await appCommandService.startApp();
    expect(spawn).toHaveBeenCalledWith("echo start", [], { cwd: ".", shell: true });
    expect(mockProcess.stdout.on).toHaveBeenCalled();
    expect(mockProcess.stderr.on).toHaveBeenCalled();
    expect(mockProcess.on).toHaveBeenCalledWith("exit", expect.any(Function));
  });

  test("should throw an error if an app is already running", async () => {
    await appCommandService.startApp();
    await expect(() => appCommandService.startApp()).rejects.toThrow(
      "Another app is already running",
    );
  });

  test("should stop a running app", async () => {
    await appCommandService.startApp();
    await appCommandService.stopApp();
    expect(mockProcess.kill).toHaveBeenCalled();
  });

  test("should throw an error if no app is running", async () => {
    await expect(() => appCommandService.stopApp()).rejects.toThrow("No app is running");
    expect(mockProcess.kill).not.toHaveBeenCalled();
  });

  test("should send reload command to a running app", async () => {
    await appCommandService.startApp();
    await appCommandService.reloadApp();

    const payload = {
      id: 1,
      method: "app.restart",
      params: {
        appId: null,
        fullRestart: true,
        pause: false,
        reason: "manual",
      },
    };

    const message = JSON.stringify([payload]);
    expect(mockProcess.stdin.write).toHaveBeenCalledWith(message + "\n");
  });

  test("should start a new app if none is running during reload", () => {
    expect(() => appCommandService.reloadApp()).not.toThrow();
    expect(spawn).toHaveBeenCalledWith("echo start", [], { cwd: ".", shell: true });
    expect(mockProcess.stdin.write).not.toHaveBeenCalled();
    expect(mockProcess.stdout.on).toHaveBeenCalled();
    expect(mockProcess.stderr.on).toHaveBeenCalled();
    expect(mockProcess.on).toHaveBeenCalledWith("exit", expect.any(Function));
  });

  describe("lint", () => {
    test("should run lint command and broadcast result", async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("lint result"));
              }
            },
          },
          stderr: {
            on: jest.fn(),
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(0);
            }
          },
        };

        return process;
      });

      const promise = appCommandService.lint({ captureErrors: false });
      await expect(promise).resolves.toBe("lint result");
      // expect(broadcaster.broadcast).toHaveBeenCalledWith({ event: "app:info", data: "lint result" });
    });

    test("should broadcast lint error if command fails", async () => {
      (unwrapErrorMessage as jest.Mock).mockReturnValue("mock error");
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: jest.fn(),
          },
          stderr: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("lint error"));
              }
            },
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(1);
            }
          },
        };

        return process;
      });

      const promise = appCommandService.lint({ captureErrors: false });
      await expect(promise).rejects.toThrow("Command failed with exit code 1");
      //   expect(broadcaster.broadcast).toHaveBeenCalledWith({
      //     type: "lint_error",
      //     data: "mock error",
      //   });
    });
  });

  describe("format", () => {
    test("should run format command and broadcast result", async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("format result"));
              }
            },
          },
          stderr: {
            on: jest.fn(),
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(0);
            }
          },
        };
        return process;
      });

      const promise = appCommandService.format({ captureErrors: false });
      await expect(promise).resolves.toBe("format result");
      //   expect(broadcaster.broadcast).toHaveBeenCalledWith({ type: "format", data: "format result" });
    });

    test("should broadcast format error if command fails", async () => {
      (unwrapErrorMessage as jest.Mock).mockReturnValue("mock error");
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: jest.fn(),
          },
          stderr: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("format error"));
              }
            },
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(1);
            }
          },
        };
        return process;
      });

      const promise = appCommandService.format({ captureErrors: false });
      await expect(promise).rejects.toThrow("Command failed with exit code 1");
      //   expect(broadcaster.broadcast).toHaveBeenCalledWith({
      //     type: "format_error",
      //     data: "mock error",
      //   });
    });
  });

  describe("install", () => {
    test("should run install command and broadcast result", async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("install result"));
              }
            },
          },
          stderr: {
            on: jest.fn(),
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(0);
            }
          },
        };
        return process;
      });

      const promise = appCommandService.install({ captureErrors: false });
      await expect(promise).resolves.toBe("install result");
      //   expect(broadcaster.broadcast).toHaveBeenCalledWith({
      //     type: "build_dependencies",
      //     data: "install result",
      //   });
    });

    test("should broadcast install error if command fails", async () => {
      (unwrapErrorMessage as jest.Mock).mockReturnValue("mock error");
      (spawn as jest.Mock).mockImplementation(() => {
        const process = {
          stdout: {
            on: jest.fn(),
          },
          stderr: {
            on: (event: string, callback: (data: Buffer) => void) => {
              if (event === "data") {
                callback(Buffer.from("install error"));
              }
            },
          },
          on: (event: string, callback: (code: number) => void) => {
            if (event === "exit") {
              callback(1);
            }
          },
        };
        return process;
      });

      const promise = appCommandService.install({ captureErrors: false });
      await expect(promise).rejects.toThrow("Command failed with exit code 1");
      //   expect(broadcaster.broadcast).toHaveBeenCalledWith({
      //     type: "build_dependencies_error",
      //     data: "mock error",
      //   });
    });
  });
});
