/* eslint-disable @typescript-eslint/unbound-method */

import { AppError } from "~/errors/appError";
import { AppService, type IAppService } from "~/services/appService";
import { BufferedStream, type IBufferedStream } from "~/utils/stream";

import type { IBroadcaster } from "~/utils/broadcaster";
import type { IProcessController, Process, ProcessOutput } from "~/utils/process";

jest.mock("~/utils/parser", () => ({
  parseFlutterEvents: jest.fn(),
}));

describe("AppService", () => {
  let appService: IAppService;
  let broadcaster: IBroadcaster;
  let mockProcess: Process;
  let processController: IProcessController;
  let stderrBufferedStream: IBufferedStream<string>;

  const mockProcessOutput = {
    stdout: "",
    stderr: "",
    exitCode: undefined,
    running: false,
    finished: false,
    addMessage: jest.fn(),
    finish: jest.fn(),
    toJSON: jest.fn(),
  } as unknown as ProcessOutput;

  beforeEach(() => {
    broadcaster = {
      broadcast: jest.fn(),
      bufferedBroadcast: jest.fn(),
    };

    processController = {
      start: jest.fn(),
    } as unknown as IProcessController;

    stderrBufferedStream = new BufferedStream<string>(3000);

    mockProcess = {
      output: mockProcessOutput,
      writeInput: jest.fn(),
      kill: jest.fn(),
      wait: jest.fn(),
      waitForEvent: jest.fn(),
      running: false,
    } as unknown as Process;

    (processController.start as jest.Mock).mockResolvedValue(mockProcess);

    appService = new AppService({
      runCommand: "flutter run",
      broadcaster,
      workingDirectory: ".",
      processController,
      stderrBufferedStream,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("init", () => {
    test("should start the app if not already running", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.init();
      expect(processController.start).toHaveBeenCalled();
    });

    test("should not start the app if already running", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      await appService.init();
      expect(processController.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("start", () => {
    test("should start an app if none is running", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      expect(processController.start).toHaveBeenCalledWith(
        expect.objectContaining({
          cmd: "flutter run",
          cwd: ".",
        }),
      );
    });

    test("should throw an AppError if an app is already running", async () => {
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.start();
      await expect(appService.start()).rejects.toThrow(AppError);
      await expect(appService.start()).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "APP_ALREADY_RUNNING",
        errorMessage: "Another app is already running",
        details: {},
      });
    });

    test("should throw an AppError if no run command is provided", async () => {
      appService = new AppService({
        runCommand: undefined,
        broadcaster,
        workingDirectory: ".",
        processController,
        stderrBufferedStream,
      });
      await expect(appService.start()).rejects.toThrow(AppError);
      await expect(appService.start()).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "NO_RUN_COMMAND",
        errorMessage: "No run command provided",
        details: {},
      });
    });

    test("should wait for app.started event if wait option is true", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
      });
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
      });
      await appService.start({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should throw an AppError on timeout when waiting for app to start", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "timeout", timeout: 1000 },
      });

      await expect(appService.start({ wait: true, timeout: 1000 })).rejects.toThrow(AppError);
      await expect(appService.start({ wait: true, timeout: 1000 })).rejects.toMatchObject({
        statusCode: 504,
        errorCode: "APP_TIMEOUT_ERROR",
        errorMessage: "Operation timed out after 1000ms",
        details: { timeout: 1000 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an AppError on process exit when waiting for app to start", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "exit", exitCode: 1 },
      });

      await expect(appService.start({ wait: true })).rejects.toThrow(AppError);
      await expect(appService.start({ wait: true })).rejects.toMatchObject({
        statusCode: 500,
        errorCode: "APP_EXIT_ERROR",
        errorMessage: "Process exited unexpectedly with code 1",
        details: { exitCode: 1 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe("reload", () => {
    test("should send reload command to a running app", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.reload();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.restart"));
    });

    test("should throw an AppError if no app is running during reload", async () => {
      await expect(appService.reload()).rejects.toThrow(AppError);
      await expect(appService.reload()).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "APP_NOT_RUNNING",
        errorMessage: "App is not running",
        details: {},
      });
      expect(processController.start).not.toHaveBeenCalled();
    });

    test("should wait for app.progress event if wait option is true", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
      });
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isOk: () => true,
        isErr: () => false,
      });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.reload({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should throw an AppError on timeout when waiting for app to reload", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "timeout", timeout: 1000 },
      });

      await expect(appService.reload({ wait: true, timeout: 1000 })).rejects.toThrow(AppError);
      await expect(appService.reload({ wait: true, timeout: 1000 })).rejects.toMatchObject({
        statusCode: 504,
        errorCode: "APP_TIMEOUT_ERROR",
        errorMessage: "Operation timed out after 1000ms",
        details: { timeout: 1000 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an AppError on process exit when waiting for app to reload", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "exit", exitCode: 1 },
      });

      await expect(appService.reload({ wait: true })).rejects.toThrow(AppError);
      await expect(appService.reload({ wait: true })).rejects.toMatchObject({
        statusCode: 500,
        errorCode: "APP_EXIT_ERROR",
        errorMessage: "Process exited unexpectedly with code 1",
        details: { exitCode: 1 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    test("should stop a running app", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.stop();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.stop"));
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an AppError if no app is running", async () => {
      await expect(appService.stop()).rejects.toThrow(AppError);
      await expect(appService.stop()).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "APP_NOT_RUNNING",
        errorMessage: "No app is running",
        details: {},
      });
    });

    test("should wait for process to exit if wait option is true", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true, isErr: () => false });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.stop({ wait: true });
      expect(mockProcess.wait).toHaveBeenCalled();
    });

    test("should throw an AppError on timeout when waiting for app to stop", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.wait as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "timeout", timeout: 1000 },
      });

      await expect(appService.stop({ wait: true, timeout: 1000 })).rejects.toThrow(AppError);
      await expect(appService.stop({ wait: true, timeout: 1000 })).rejects.toMatchObject({
        statusCode: 504,
        errorCode: "APP_TIMEOUT_ERROR",
        errorMessage: "Operation timed out after 1000ms",
        details: { timeout: 1000 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an AppError on process exit with non-zero code when waiting for app to stop", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue({ isOk: () => true });
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.wait as jest.Mock).mockResolvedValue({
        isErr: () => true,
        error: { type: "exit", exitCode: 1 },
      });

      await expect(appService.stop({ wait: true })).rejects.toThrow(AppError);
      await expect(appService.stop({ wait: true })).rejects.toMatchObject({
        statusCode: 500,
        errorCode: "APP_EXIT_ERROR",
        errorMessage: "Process exited unexpectedly with code 1",
        details: { exitCode: 1 },
      });
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
});
