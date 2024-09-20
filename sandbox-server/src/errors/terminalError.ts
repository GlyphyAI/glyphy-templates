import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { ServiceError } from "~/errors/serviceError";

export class TerminalError extends Error implements ServiceError {
  public readonly domain = "TERMINAL_ERROR";

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
      defaultErrorCode = "TERMINAL_OPERATION_ERROR",
      defaultErrorMessage = "An error occurred during Terminal operation",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails?: Record<string, unknown>;
    },
  ): TerminalError {
    const statusCode = defaultStatusCode;
    const errorCode = defaultErrorCode;
    const errorMessage = unwrapErrorMessage(error) ?? defaultErrorMessage;

    const details: Record<string, unknown> = {
      ...additionalDetails,
    };

    return new TerminalError(statusCode, errorCode, errorMessage, details);
  }
}
