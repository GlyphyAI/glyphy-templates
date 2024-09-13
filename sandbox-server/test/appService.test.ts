/* eslint-disable @typescript-eslint/unbound-method */

import { err, ok } from "neverthrow";
import { AppService, type IAppService } from "~/services/appService";
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
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.init();
      expect(processController.start).toHaveBeenCalled();
    });

    test("should not start the app if already running", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      await appService.init();
      expect(processController.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("start", () => {
    test("should start an app if none is running", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      expect(processController.start).toHaveBeenCalledWith(
        expect.objectContaining({
          cmd: "flutter run",
          cwd: ".",
        }),
      );
    });

    test("should throw an error if an app is already running", async () => {
      (mockProcess as unknown as { running: boolean }).running = true;
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
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(ok("Event occurred"));
      await appService.start({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should throw an error on timeout when waiting for app to start", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(
        err({ type: "timeout", timeout: 1000 }),
      );

      await expect(appService.start({ wait: true, timeout: 1000 })).rejects.toThrow(
        "Timeout waiting for app to start after 1000ms",
      );
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an error on process exit when waiting for app to start", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(err({ type: "exit", exitCode: 1 }));

      await expect(appService.start({ wait: true })).rejects.toThrow("Process exited with code 1");
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe("reload", () => {
    test("should send reload command to a running app", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.reload();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.restart"));
    });

    test("should start a new app if none is running during reload", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.reload();
      expect(processController.start).toHaveBeenCalled();
    });

    test("should wait for app.progress event if wait option is true", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(ok("Event occurred"));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.reload({ wait: true });
      expect(mockProcess.waitForEvent).toHaveBeenCalled();
    });

    test("should throw an error on timeout when waiting for app to reload", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(
        err({ type: "timeout", timeout: 1000 }),
      );

      await expect(appService.reload({ wait: true, timeout: 1000 })).rejects.toThrow(
        "Timeout waiting for app to reload after 1000ms",
      );
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an error on process exit when waiting for app to reload", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.waitForEvent as jest.Mock).mockResolvedValue(err({ type: "exit", exitCode: 1 }));

      await expect(appService.reload({ wait: true })).rejects.toThrow("Process exited with code 1");
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    test("should stop a running app", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.stop();
      expect(mockProcess.writeInput).toHaveBeenCalledWith(expect.stringContaining("app.stop"));
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an error if no app is running", async () => {
      await expect(appService.stop()).rejects.toThrow("No app is running");
    });

    test("should wait for process to exit if wait option is true", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      await appService.stop({ wait: true });
      expect(mockProcess.wait).toHaveBeenCalled();
    });

    test("should throw an error on timeout when waiting for app to stop", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.wait as jest.Mock).mockResolvedValue(err({ type: "timeout", timeout: 1000 }));

      await expect(appService.stop({ wait: true, timeout: 1000 })).rejects.toThrow(
        "App did not stop within 1000ms",
      );
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    test("should throw an error on process exit with non-zero code when waiting for app to stop", async () => {
      (mockProcess.wait as jest.Mock).mockResolvedValue(ok({ exitCode: 0 }));
      await appService.start();
      (mockProcess as unknown as { running: boolean }).running = true;
      (mockProcess.wait as jest.Mock).mockResolvedValue(err({ type: "exit", exitCode: 1 }));

      await expect(appService.stop({ wait: true })).rejects.toThrow(
        "App failed to stop with exit code 1",
      );
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
});
