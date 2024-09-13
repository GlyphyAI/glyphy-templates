import { ProcessController } from "~/utils/process";

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

    expect(result.finished).toBe(true);
    expect(result.output.stdout).toContain("Hello, World!");
    expect(result.output.stderr).toContain("Goodbye, World!");
    expect(result.output.exitCode).toBe(0);
  });

  test("Process timeout", async () => {
    const result = await controller.startAndWait({
      cmd: 'sleep 5 && echo "This should not be printed"',
      timeout: 2000,
    });

    expect(result.finished).toBe(false);
    expect(result.timeout).toBe(true);
    expect(result.output.stdout).not.toContain("This should not be printed");
  });

  test("Sending input data to stdin", async () => {
    const stdinProcess = await controller.start({
      cmd: 'read input && echo "You entered: $input"',
    });

    expect(stdinProcess.output.running).toBe(true);
    expect(stdinProcess.pid).toBeGreaterThan(0);

    stdinProcess.writeInput("Hello from stdin!\n");
    const stdinResult = await stdinProcess.wait();

    expect(stdinResult.finished).toBe(true);
    expect(stdinResult.output.stdout).toContain("You entered: Hello from stdin!");
  });

  test("Starting a new process while one is running", async () => {
    const process1 = await controller.start({ cmd: "sleep 2" });

    await expect(controller.start({ cmd: 'echo "This should succeed"' })).resolves.toBeDefined();

    const result = await process1.wait();
    expect(result.finished).toBe(true);
  });

  test("Basic error handling", async () => {
    const result = await controller.startAndWait({
      cmd: 'sh -c "echo error > /dev/stderr; exit 1"',
      timeout: 2000,
    });

    expect(result.finished).toBe(true);
    expect(result.output.exitCode).toBe(1);
    expect(result.output.stderr).toContain("error");
  });

  test("Kill process and ensure it was killed", async () => {
    const process = await controller.start("sleep 5");

    setTimeout(() => {
      void process.kill();
    }, 1000);

    const result = await process.wait();
    expect(result.finished).toBe(true);
    expect(result.output.exitCode).toBeUndefined();
  });

  test("Handling a process with no output", async () => {
    const result = await controller.startAndWait({
      cmd: "sleep 1",
      timeout: 2000,
    });

    expect(result.finished).toBe(true);
    expect(result.output.stdout).toBe("");
    expect(result.output.stderr).toBe("");
    expect(result.output.exitCode).toBe(0);
  });

  test("Process exit with non-zero code", async () => {
    const result = await controller.startAndWait({
      cmd: "exit 2",
      timeout: 2000,
    });

    expect(result.finished).toBe(true);
    expect(result.output.exitCode).toBe(2);
  });

  test("Wait for event with successful condition", async () => {
    const process = await controller.start({
      cmd: 'echo "Event occurred" && sleep 2',
    });

    const eventResult = await process.waitForEvent({
      condition: (payload: string) => payload.includes("Event occurred"),
      timeout: 3000,
    });

    expect(eventResult.eventReceived).toBe(true);
    expect(eventResult.data).toContain("Event occurred");
  });

  test("Wait for event with timeout", async () => {
    const process = await controller.start({
      cmd: "sleep 5",
    });

    const eventResult = await process.waitForEvent({
      condition: () => false,
      timeout: 2000,
    });

    if (eventResult.timeout) {
      process.kill();
    }

    expect(eventResult.eventReceived).toBe(false);
    expect(eventResult.timeout).toBe(true);
  });

  test("Wait for event with process exit", async () => {
    const process = await controller.start({
      cmd: "exit 3",
    });

    const eventResult = await process.waitForEvent({
      condition: () => false,
      timeout: 2000,
    });

    expect(eventResult.eventReceived).toBe(false);
    expect(eventResult.exitCode).toBe(3);
  });
});
