import { ProcessController } from "~/utils/process";

describe("ProcessController", () => {
  let controller: ProcessController;

  beforeEach(() => {
    controller = new ProcessController();
  });

  test("Basic process execution", async () => {
    const output = await controller.startAndWait({
      cmd: 'echo "Hello, World!" && sleep 1 && echo "Goodbye, World!" >&2',
      timeout: 2000,
    });

    expect(output.stdout).toContain("Hello, World!");
    expect(output.stderr).toContain("Goodbye, World!");
    expect(output.exitCode).toBe(0);
  });

  test("Process timeout", async () => {
    await expect(
      controller.startAndWait({
        cmd: 'sleep 5 && echo "This should not be printed"',
        timeout: 2000,
      }),
    ).rejects.toThrow("Process timed out after 2000ms");
  });

  test("Sending input data to stdin", async () => {
    const stdinProcess = await controller.start({
      cmd: 'read input && echo "You entered: $input"',
    });

    expect(stdinProcess.output.running).toBe(true);
    expect(stdinProcess.pid).toBeGreaterThan(0);

    await stdinProcess.writeInput("Hello from stdin!\n");
    const stdinOutput = await stdinProcess.wait();

    expect(stdinOutput.stdout).toContain("You entered: Hello from stdin!");
  });

  test("Starting a new process while one is running", async () => {
    const process1 = await controller.start({ cmd: "sleep 2" });

    await expect(controller.start({ cmd: 'echo "This should fail"' })).resolves.toBeDefined();

    await process1.wait();
  });

  test("Basic error handling", async () => {
    const output = await controller.startAndWait({
      cmd: 'sh -c "echo error > /dev/stderr; exit 1"',
      timeout: 2000,
    });

    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain("error");
  });

  test("Kill process and ensure it was killed", async () => {
    const process = await controller.start({
      cmd: "sleep 5",
      timeout: 5000,
    });

    setTimeout(() => {
      void process.kill();
    }, 1000);

    const processOutput = await process.wait();
    expect(processOutput.finished).toBe(true);
    expect(processOutput.exitCode).toBeUndefined();
  });

  test("Handling a process with no output", async () => {
    const output = await controller.startAndWait({
      cmd: "sleep 1",
      timeout: 2000,
    });

    expect(output.stdout).toBe("");
    expect(output.stderr).toBe("");
    expect(output.exitCode).toBe(0);
  });
});
