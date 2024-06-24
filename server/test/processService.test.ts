/* eslint-disable @typescript-eslint/unbound-method */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { ProcessService, type IProcessService } from "~/services/processService";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { CommandsTemplate } from "~/models/template";
import type { IBroadcaster } from "~/utils/broadcaster";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

jest.mock("~/utils/zodErrors", () => ({
  unwrapErrorMessage: jest.fn(),
}));

describe("ProcessService", () => {
  let processService: IProcessService;
  let template: CommandsTemplate;
  let broadcaster: IBroadcaster;
  let mockProcess: ChildProcessWithoutNullStreams;

  beforeEach(() => {
    template = {
      startCommand: "echo start",
      lintCommand: "echo lint",
      formatCommand: "echo format",
      buildDependenciesCommand: "echo install",
      workingDirectory: ".",
      startOnInitialize: false,
    };

    broadcaster = {
      broadcast: jest.fn(),
    };

    processService = new ProcessService(template, broadcaster);

    mockProcess = {
      stdout: {
        on: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      stdin: {
        write: jest.fn(),
      },
      on: jest.fn(),
      kill: jest.fn(),
    } as unknown as ChildProcessWithoutNullStreams;

    (spawn as jest.Mock).mockImplementation(() => mockProcess);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should start a process if none is running", async () => {
    await processService.startProcess();
    expect(spawn).toHaveBeenCalledWith("echo", ["start"], { cwd: "." });
    expect(mockProcess.stdout.on).toHaveBeenCalled();
    expect(mockProcess.stderr.on).toHaveBeenCalled();
    expect(mockProcess.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(mockProcess.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  test("should throw an error if a process is already running", async () => {
    await processService.startProcess();
    expect(() => processService.startProcess()).toThrow("Another process is already running");
  });

  test("should stop a running process", async () => {
    await processService.startProcess();
    await processService.stopProcess();
    expect(mockProcess.kill).toHaveBeenCalled();
  });

  test("should do nothing if no process is running", () => {
    expect(() => processService.stopProcess()).not.toThrow();
    expect(mockProcess.kill).not.toHaveBeenCalled();
  });

  test("should send reload command to a running process", async () => {
    await processService.startProcess();
    await processService.reloadProcess();
    expect(mockProcess.stdin.write).toHaveBeenCalledWith("R\n");
  });

  test("should do nothing if no process is running during reload", () => {
    expect(() => processService.reloadProcess()).not.toThrow();
    expect(mockProcess.stdin.write).not.toHaveBeenCalled();
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
            if (event === "close") {
              callback(0);
            }
          },
        };
        return process;
      });

      const promise = processService.lint({ captureErrors: false });
      await expect(promise).resolves.toBe("lint result");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({ type: "lint", data: "lint result" });
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
            if (event === "close") {
              callback(1);
            }
          },
        };
        return process;
      });

      const promise = processService.lint({ captureErrors: false });
      await expect(promise).rejects.toEqual("lint error");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        type: "lint_error",
        data: "mock error",
      });
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
            if (event === "close") {
              callback(0);
            }
          },
        };
        return process;
      });

      const promise = processService.format({ captureErrors: false });
      await expect(promise).resolves.toBe("format result");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({ type: "format", data: "format result" });
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
            if (event === "close") {
              callback(1);
            }
          },
        };
        return process;
      });

      const promise = processService.format({ captureErrors: false });
      await expect(promise).rejects.toEqual("format error");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        type: "format_error",
        data: "mock error",
      });
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
            if (event === "close") {
              callback(0);
            }
          },
        };
        return process;
      });

      const promise = processService.install({ captureErrors: false });
      await expect(promise).resolves.toBe("install result");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        type: "build_dependencies",
        data: "install result",
      });
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
            if (event === "close") {
              callback(1);
            }
          },
        };
        return process;
      });

      const promise = processService.install({ captureErrors: false });
      await expect(promise).rejects.toEqual("install error");
      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        type: "build_dependencies_error",
        data: "mock error",
      });
    });
  });
});
