/* eslint-disable @typescript-eslint/unbound-method */

import { EventEmitter } from "events";
import { spawn, type IPty } from "node-pty";
import { TerminalService } from "~/services/terminalService";

jest.mock("node-pty", () => ({
  spawn: jest.fn(),
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const nodeProcess = process;

describe("TerminalService", () => {
  let terminalService: TerminalService;
  let mockProcess: jest.Mocked<IPty>;
  let mockEmitter: jest.Mocked<EventEmitter>;

  beforeEach(() => {
    mockProcess = {
      onData: jest.fn(),
      onExit: jest.fn(),
      kill: jest.fn(),
      write: jest.fn(),
    } as unknown as jest.Mocked<IPty>;

    mockEmitter = new EventEmitter() as jest.Mocked<EventEmitter>;
    jest.spyOn(mockEmitter, "emit");
    jest.spyOn(mockEmitter, "on");

    mockSpawn.mockReturnValue(mockProcess);

    terminalService = new TerminalService(mockEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("createTerminal should create a new terminal", () => {
    terminalService.createTerminal("1", "bash");

    expect(mockSpawn).toHaveBeenCalledWith("bash", [], {
      name: "xterm-color",
      cwd: nodeProcess.env.HOME,
      env: nodeProcess.env,
    });
    expect(terminalService.listTerminals().includes("1")).toBe(true);
  });

  test("createTerminal should throw an error if terminal already exists", () => {
    terminalService.createTerminal("1", "bash");
    expect(() => terminalService.createTerminal("1", "bash")).toThrowError(
      "Terminal with id 1 already exists",
    );
  });

  test("deleteTerminal should delete an existing terminal", () => {
    terminalService.createTerminal("1", "bash");
    terminalService.deleteTerminal("1");

    expect(mockProcess.kill).toHaveBeenCalled();
    expect(terminalService.listTerminals().includes("1")).toBe(false);
  });

  test("deleteTerminal should throw an error if terminal does not exist", () => {
    expect(() => terminalService.deleteTerminal("1")).toThrowError(
      "Terminal with id 1 does not exist",
    );
  });

  test("sendCommand should send a command to the terminal", () => {
    terminalService.createTerminal("1", "bash");
    terminalService.sendCommand("1", "echo Hello");

    expect(mockProcess.write).toHaveBeenCalledWith("echo Hello\r");
  });

  test("sendCommand should throw an error if terminal does not exist", () => {
    expect(() => terminalService.sendCommand("1", "echo Hello")).toThrowError(
      "Terminal with id 1 does not exist",
    );
  });

  test("onTerminalOutput should add a listener for terminal output", () => {
    terminalService.createTerminal("1", "bash");
    const listener = jest.fn();

    terminalService.onTerminalOutput("1", listener);
    expect(mockEmitter.on).toHaveBeenCalledWith("output", listener);
  });

  test("onTerminalOutput should throw an error if terminal does not exist", () => {
    expect(() => terminalService.onTerminalOutput("1", jest.fn())).toThrowError(
      "Terminal with id 1 does not exist",
    );
  });

  test("onTerminalClose should add a listener for terminal close", () => {
    terminalService.createTerminal("1", "bash");
    const listener = jest.fn();

    terminalService.onTerminalClose("1", listener);
    expect(mockEmitter.on).toHaveBeenCalledWith("close", listener);
  });

  test("onTerminalClose should throw an error if terminal does not exist", () => {
    expect(() => terminalService.onTerminalClose("1", jest.fn())).toThrowError(
      "Terminal with id 1 does not exist",
    );
  });

  test("emitter should emit 'output' on process onData", () => {
    terminalService.createTerminal("1", "bash");
    const listener = jest.fn();
    terminalService.onTerminalOutput("1", listener);

    const data = "hello";
    expect(mockProcess.onData).toHaveBeenCalled();
    if (mockProcess.onData.mock.calls[0]) {
      mockProcess.onData.mock.calls[0][0](data);
      expect(mockEmitter.emit).toHaveBeenCalledWith("output", data);
    }
  });

  test("emitter should emit 'close' on process onExit and remove terminal", () => {
    terminalService.createTerminal("1", "bash");
    const listener = jest.fn();
    terminalService.onTerminalClose("1", listener);

    const exitCode = 0;
    expect(mockProcess.onExit).toHaveBeenCalled();
    if (mockProcess.onExit.mock.calls[0]) {
      mockProcess.onExit.mock.calls[0][0]({ exitCode });
      expect(mockEmitter.emit).toHaveBeenCalledWith("close", exitCode);
      expect(terminalService.listTerminals().includes("1")).toBe(false);
    }
  });
});
