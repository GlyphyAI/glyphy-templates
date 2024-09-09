import { ZodError } from "zod";

export function concatZodErrors(error: ZodError, separator = "\n"): string {
  return error.errors.map((err) => `${err.path.join(".")} - ${err.message}`).join(separator);
}

export function unwrapErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return concatZodErrors(error);
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return "An unknown error occurred";
  }
}
