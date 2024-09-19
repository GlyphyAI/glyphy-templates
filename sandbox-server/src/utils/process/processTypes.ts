/// Process Message Types & Type Guards
type StdoutMessage = { type: "stdout"; message: string };
type StderrMessage = { type: "stderr"; message: string };
type ExitMessage = { type: "exit"; exitCode: number | undefined };

export type ProcessMessage = StdoutMessage | StderrMessage | ExitMessage;

export function isStdoutMessage(message: ProcessMessage): message is StdoutMessage {
  return message.type === "stdout";
}

export function isStderrMessage(message: ProcessMessage): message is StderrMessage {
  return message.type === "stderr";
}

/// Process Error Types
export type TimeoutError = {
  type: "timeout";
  timeout: number;
};

export type ExitCodeError = {
  type: "exit";
  exitCode: number | undefined;
};

export type ProcessError = TimeoutError | ExitCodeError;
