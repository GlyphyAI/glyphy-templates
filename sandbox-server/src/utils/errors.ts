import { ZodError } from "zod";

export function concatZodErrors(error: ZodError, separator = "\n"): string {
  return error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join(separator);
}

export function unwrapErrorMessage(error: unknown): string | undefined;
export function unwrapErrorMessage(error: unknown, defaultErrorMessage: string): string;
export function unwrapErrorMessage(
  error: unknown,
  defaultErrorMessage?: string,
): string | undefined {
  if (error instanceof ZodError) {
    return concatZodErrors(error);
  } else if (error instanceof Error) {
    return error.message;
  } else if (defaultErrorMessage !== undefined) {
    return defaultErrorMessage;
  } else {
    return undefined;
  }
}
