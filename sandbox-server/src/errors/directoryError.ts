import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { ServiceError } from "~/errors/serviceError";

export class DirectoryError extends Error implements ServiceError {
  public readonly domain = "DIRECTORY_ERROR";

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
      defaultErrorCode = "DIRECTORY_OPERATION_ERROR",
      defaultErrorMessage = "An error occurred during directory operation",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails: Record<string, unknown>;
    },
  ): DirectoryError {
    const statusCode = defaultStatusCode;
    const errorCode = defaultErrorCode;
    const errorMessage = unwrapErrorMessage(error) ?? defaultErrorMessage;

    const details: Record<string, unknown> = {
      ...additionalDetails,
    };

    return new DirectoryError(statusCode, errorCode, errorMessage, details);
  }
}
