import { unwrapErrorMessage } from "~/utils/errors";

import type { ServiceError } from "~/errors/serviceError";

export class GitError extends Error implements ServiceError {
  public readonly domain = "GIT_ERROR";

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
      defaultErrorCode = "GIT_OPERATION_ERROR",
      defaultErrorMessage = "An error occurred during Git operation",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails?: Record<string, unknown>;
    },
  ): GitError {
    const statusCode = defaultStatusCode;
    const errorCode = defaultErrorCode;
    const errorMessage = unwrapErrorMessage(error) ?? defaultErrorMessage;

    const details: Record<string, unknown> = {
      ...additionalDetails,
    };

    return new GitError(statusCode, errorCode, errorMessage, details);
  }
}
