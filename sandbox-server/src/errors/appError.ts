import { unwrapErrorMessage } from "~/utils/errors";
import { isProcessError } from "~/utils/process";

import type { ServiceError } from "~/errors";

export class AppError extends Error implements ServiceError {
  public readonly domain = "APP_ERROR";

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
    error: unknown,
    {
      defaultStatusCode = 500,
      defaultErrorCode = "APP_OPERATION_ERROR",
      defaultErrorMessage = "An error occurred during App operation",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails?: Record<string, unknown>;
    },
  ): AppError {
    if (error instanceof AppError) {
      return new AppError(error.statusCode, error.errorCode, error.errorMessage, {
        ...error.details,
        ...additionalDetails,
      });
    }

    let statusCode = defaultStatusCode;
    let errorCode = defaultErrorCode;
    let errorMessage = unwrapErrorMessage(error) ?? defaultErrorMessage;

    const details: Record<string, unknown> = { ...additionalDetails };

    if (isProcessError(error)) {
      const processError = error;
      switch (processError.type) {
        case "timeout":
          statusCode = 504; // Gateway Timeout
          errorCode = "APP_TIMEOUT_ERROR";
          errorMessage = `Operation timed out after ${processError.timeout}ms`;
          details.timeout = processError.timeout;
          break;
        case "exit":
          statusCode = 500; // Internal Server Error
          errorCode = "APP_EXIT_ERROR";
          errorMessage = `Process exited unexpectedly with code ${processError.exitCode}`;
          details.exitCode = processError.exitCode;
          break;
      }
    } else {
      details.originalError = error instanceof Error ? error.message : String(error);
    }

    return new AppError(statusCode, errorCode, errorMessage, details);
  }
}
