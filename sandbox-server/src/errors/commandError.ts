import type { ServiceError } from "~/errors/serviceError";
import type { ProcessError } from "~/utils/process/processTypes";

export class CommandError extends Error implements ServiceError {
  public readonly domain = "COMMAND_ERROR";

  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly details: Record<string, unknown>,
  ) {
    super(errorMessage);
    this.name = this.constructor.name;
  }

  static fromError(
    error: ProcessError,
    {
      defaultStatusCode = 500,
      defaultErrorCode = "COMMAND_EXECUTION_ERROR",
      defaultErrorMessage = "An error occurred during command execution",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails: Record<string, unknown>;
    },
  ): CommandError {
    let statusCode = defaultStatusCode;
    let errorCode = defaultErrorCode;
    let errorMessage = defaultErrorMessage;

    if (error.type === "timeout") {
      statusCode = 408;
      errorCode = "COMMAND_TIMEOUT";
      errorMessage = "Command execution timed out";
    } else if (error.type === "exit") {
      errorCode = "COMMAND_FAILED";
      errorMessage = `Command failed with exit code ${error.exitCode}`;
    }

    const details: Record<string, unknown> = {
      errorType: error.type,
      ...additionalDetails,
    };

    if (error.type === "exit") {
      details.exitCode = error.exitCode;
    }

    return new CommandError(statusCode, errorCode, errorMessage, details);
  }
}
