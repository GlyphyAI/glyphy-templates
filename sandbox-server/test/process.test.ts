import { ProcessController } from "~/utils/process";

import type { ExitCodeError, TimeoutError } from "~/utils/process";

describe("ProcessController", () => {
  let controller: ProcessController;

  beforeEach(() => {
    controller = new ProcessController();
  });

  test("Basic process execution", async () => {
    const result = await controller.startAndWait({
      cmd: 'echo "Hello, World!" && sleep 1 && echo "Goodbye, World!" >&2',
      timeout: 2000,
    });

    result.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.stdout).toContain("Hello, World!");
        expect(output.stderr).toContain("Goodbye, World!");
        expect(output.exitCode).toBe(0);
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Process timeout", async () => {
    const result = await controller.startAndWait({
      cmd: 'sleep 5 && echo "This should not be printed"',
      timeout: 2000,
    });

    result.match(
      (output) => {
        fail(`Expected timeout, but got success: ${JSON.stringify(output)}`);
      },
      (error) => {
        expect(error.type).toBe("timeout");
        expect((error as TimeoutError).timeout).toBe(2000);
      },
    );
  });

  test("Sending input data to stdin", async () => {
    const stdinProcess = await controller.start({
      cmd: 'read input && echo "You entered: $input"',
    });

    expect(stdinProcess.output.running).toBe(true);
    expect(stdinProcess.pid).toBeGreaterThan(0);

    stdinProcess.writeInput("Hello from stdin!\n");
    const stdinResult = await stdinProcess.wait();

    stdinResult.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.stdout).toContain("You entered: Hello from stdin!");
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Starting a new process while one is running", async () => {
    const process1 = await controller.start({ cmd: "sleep 2" });

    await expect(controller.start({ cmd: 'echo "This should succeed"' })).resolves.toBeDefined();

    const result = await process1.wait();
    expect(result.isOk()).toBe(true);
  });

  test("Basic error handling", async () => {
    const result = await controller.startAndWait({
      cmd: 'sh -c "echo error > /dev/stderr; exit 1"',
      timeout: 2000,
    });

    result.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.exitCode).toBe(1);
        expect(output.stderr).toContain("error");
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Kill process and ensure it was killed", async () => {
    const process = await controller.start("sleep 5");

    setTimeout(() => {
      void process.kill();
    }, 1000);

    const result = await process.wait();
    result.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.exitCode).not.toBe(0);
      },
      (error) => {
        fail(`Killed process should not be reported as errors, but got: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Handling a process with no output", async () => {
    const result = await controller.startAndWait({
      cmd: "sleep 1",
      timeout: 2000,
    });

    result.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.stdout).toBe("");
        expect(output.stderr).toBe("");
        expect(output.exitCode).toBe(0);
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Process exit with non-zero code", async () => {
    const result = await controller.startAndWait({
      cmd: "exit 2",
      timeout: 2000,
    });

    result.match(
      (output) => {
        expect(output.finished).toBe(true);
        expect(output.exitCode).toBe(2);
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Wait for event with successful condition", async () => {
    const process = await controller.start({
      cmd: 'echo "Event occurred" && sleep 2',
    });

    const eventResult = await process.waitForEvent({
      condition: (payload: string) => payload.includes("Event occurred"),
      timeout: 3000,
    });

    eventResult.match(
      (value) => {
        expect(value).toContain("Event occurred");
      },
      (error) => {
        fail(`Expected success, but got error: ${JSON.stringify(error)}`);
      },
    );
  });

  test("Wait for event with timeout", async () => {
    const process = await controller.start({
      cmd: "sleep 5",
    });

    const eventResult = await process.waitForEvent({
      condition: () => false,
      timeout: 2000,
    });

    eventResult.match(
      (value) => {
        fail(`Expected timeout, but got success: ${JSON.stringify(value)}`);
      },
      (error) => {
        expect(error.type).toBe("timeout");
        expect((error as TimeoutError).timeout).toBe(2000);
      },
    );

    process.kill();
  });

  test("Wait for event with process exit", async () => {
    const process = await controller.start({
      cmd: "exit 3",
    });

    const eventResult = await process.waitForEvent<boolean>({
      condition: () => false,
      timeout: 2000,
    });

    eventResult.match(
      (value) => {
        fail(`Expected exit error, but got success: ${JSON.stringify(value)}`);
      },
      (error) => {
        expect(error.type).toBe("exit");
        expect((error as ExitCodeError).exitCode).toBe(3);
      },
    );
  });
});
