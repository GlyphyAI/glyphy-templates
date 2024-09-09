/* eslint-disable @typescript-eslint/unbound-method */

import { AppService, type IAppService } from "~/services/appService";
import { parseFlutterEvents } from "~/utils/parser";
import { BufferedStream, type IBufferedStream } from "~/utils/stream";

import type { IBroadcaster } from "~/utils/broadcaster";
import type { IProcessController, Process } from "~/utils/process";

jest.mock("~/utils/parser", () => ({
  parseFlutterEvents: jest.fn(),
}));

describe("AppService", () => {
  let appService: IAppService;
  let broadcaster: IBroadcaster;
  let mockProcess: Process;
  let processController: IProcessController;
  let stderrBufferedStream: IBufferedStream<string>;

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
      output: { stdout: "", stderr: "" },
      writeInput: jest.fn(),
      kill: jest.fn(),
      wait: jest.fn(),
      waitForEvent: jest.fn(),
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
      await appService.init();
      expect(processController.start).toHaveBeenCalled();
    });

    test("should not start the app if already running", async () => {
      await appService.start();
      await appService.init();
      expect(processController.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("start", () => {
    test("should start an app if none is running", async () => {
      await appService.start();
      expect(processController.start).toHaveBeenCalledWith(
        expect.objectContaining({
          cmd: "flutter run",
          cwd: ".",
        }),
      );
    });

    test("should throw an error if an app is already running", async () => {
      await appService.start();
      await expect(appService.start()).rejects.toThrow("Another app is already running");
    });

    test("should throw an error if no run command is provided", async () => {
      appService = new AppService({
        runCommand: undefined,
        broadcaster,
        workingDirectory: ".",
        processController,
        stderrBufferedStream,
      });
      await expect(appService.start()).rejects.toThrow("No run command provided");
    });

    test("should wait for app.started event if wait option is true", async () => {
      (parseFlutterEvents as jest.Mock).mockReturnValue([{ event: "app.started" }]);
      await appService.start({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should stop the app if wait times out", async () => {
      (mockProcess.waitForEvent as jest.Mock).mockRejectedValue(new Error("Timeout"));
      await expect(appService.start({ wait: true, timeout: 1000 })).rejects.toThrow("Timeout");
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should broadcast app info events", async () => {
      await appService.start();

      type StartCall = [{ onStdout: (data: Buffer) => void }];
      const startCall = (processController.start as jest.Mock).mock.calls[0] as StartCall;
      const stdoutHandler = startCall[0].onStdout;

      stdoutHandler(Buffer.from("App started"));

      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        event: "app:info",
        params: { message: "App started" },
      });
    });

    test("should set appId when received in Flutter events", async () => {
      const events = parseFlutterEvents as jest.Mock;
      events.mockReturnValue([{ event: "app.started", params: { appId: "test-app-id" } }]);
      await appService.start();

      type StartCall = [{ onStdout: (data: Buffer) => void }];
      const startCall = (processController.start as jest.Mock).mock.calls[0] as StartCall;
      const options = startCall[0];
      const stdoutHandler = options.onStdout;

      stdoutHandler(Buffer.from("App started"));

      expect(broadcaster.broadcast).toHaveBeenCalledWith({
        event: "app:info",
        params: { event: "app.started", appId: "test-app-id" },
      });
    });
  });

  describe("reload", () => {
    test("should send reload command to a running app", async () => {
      await appService.start();
      await appService.reload();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.restart"));
    });

    test("should start a new app if none is running during reload", async () => {
      await appService.reload();
      expect(processController.start).toHaveBeenCalled();
    });

    test("should wait for app.progress event if wait option is true", async () => {
      await appService.start();
      (parseFlutterEvents as jest.Mock).mockReturnValue([
        { event: "app.progress", params: { finished: true } },
      ]);
      await appService.reload({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should stop the app if wait times out during reload", async () => {
      await appService.start();
      (mockProcess.waitForEvent as jest.Mock).mockRejectedValue(new Error("Timeout"));
      await expect(appService.reload({ wait: true, timeout: 1000 })).rejects.toThrow("Timeout");
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    test("should stop a running app", async () => {
      await appService.start();
      await appService.stop();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.stop"));
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an error if no app is running", async () => {
      await expect(appService.stop()).rejects.toThrow("No app is running");
    });

    test("should wait for process to exit if wait option is true", async () => {
      await appService.start();
      await appService.stop({ wait: true });
      expect(mockProcess.wait).toHaveBeenCalled();
    });

    test("should kill the process if wait times out", async () => {
      await appService.start();
      (mockProcess.wait as jest.Mock).mockRejectedValue(new Error("Timeout"));
      await expect(appService.stop({ wait: true, timeout: 1000 })).rejects.toThrow("Timeout");
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  test("should broadcast stderr messages", async () => {
    await appService.start();

    type AppServiceWithFlushErrors = typeof appService & {
      flushErrors: (errors: string[]) => void;
    };

    (appService as AppServiceWithFlushErrors).flushErrors(["Error message"]);

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: "app:error",
      params: { error: "Error message" },
    });
  });

  test("should broadcast exit event when process exits", async () => {
    await appService.start();

    type StartCall = [{ onExit: (code: number) => void }];
    const startCall = (processController.start as jest.Mock).mock.calls[0] as StartCall;
    const exitHandler = startCall[0].onExit;

    exitHandler(0);

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: "app:exit",
      params: { code: 0, error: null },
    });
  });

  test("should broadcast exit event with error when process exits with non-zero code", async () => {
    await appService.start();

    type StartCall = [{ onExit: (code: number) => void }];
    const startCall = (processController.start as jest.Mock).mock.calls[0] as StartCall;
    const exitHandler = startCall[0].onExit;

    type MockProcess = Process & { output: { stderr: string } };
    const mockProcessWithStderr = mockProcess as MockProcess;
    mockProcessWithStderr.output = { stderr: "Error occurred" } as MockProcess["output"];

    exitHandler(1);

    expect(broadcaster.broadcast).toHaveBeenCalledWith({
      event: "app:exit",
      params: { code: 1, error: "Error occurred" },
    });
  });
});