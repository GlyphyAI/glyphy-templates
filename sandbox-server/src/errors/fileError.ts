import type { ServiceError } from "~/errors/serviceError";

export class FileError extends Error implements ServiceError {
  public readonly domain = "FILE_ERROR";

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
      defaultErrorCode = "FILE_OPERATION_ERROR",
      defaultErrorMessage = "An error occurred during file operation",
      additionalDetails = {},
    }: {
      defaultStatusCode?: number;
      defaultErrorCode?: string;
      defaultErrorMessage?: string;
      additionalDetails?: Record<string, unknown>;
    },
  ): FileError {
    let statusCode = defaultStatusCode;
    let errorCode = defaultErrorCode;
    let errorMessage = defaultErrorMessage;

    const details: Record<string, unknown> = { ...additionalDetails };

    if (error instanceof Error) {
      details.originalError = error.message;
      if ("code" in error && typeof error.code === "string") {
        details.errorCode = error.code;
        switch (error.code) {
          case "ENOENT":
            statusCode = 404;
            errorCode = "FILE_NOT_FOUND";
            errorMessage = `File not found: ${defaultErrorMessage}`;
            break;
          case "EACCES":
            statusCode = 403;
            errorCode = "FILE_ACCESS_DENIED";
            errorMessage = `Access denied: ${defaultErrorMessage}`;
            break;
          default:
            break;
        }
      }
    } else {
      details.originalError = String(error);
    }

    return new FileError(statusCode, errorCode, errorMessage, details);
  }
}
