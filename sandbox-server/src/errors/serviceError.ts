export interface ServiceError extends Error {
  readonly domain: string;
  readonly statusCode: number;
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly details: Record<string, unknown>;
}

export function isServiceError(error: Error): error is ServiceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "domain" in error &&
    "statusCode" in error &&
    "errorCode" in error &&
    "errorMessage" in error &&
    "details" in error
  );
}
