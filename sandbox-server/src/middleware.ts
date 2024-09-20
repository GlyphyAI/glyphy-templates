import { json as jsonParser } from "express";
import { ZodError } from "zod";
import { isServiceError } from "~/errors";

import type { Application, NextFunction, Request, Response } from "express";

function serviceErrorHandler(err: Error, _req: Request, res: Response, next: NextFunction) {
  if (!isServiceError(err)) {
    next(err);
    return;
  }

  res.status(err.statusCode).json({
    error: {
      domain: err.domain,
      code: err.errorCode,
      message: err.errorMessage,
      details: err.details,
    },
  });
}

function zodValidationHandler(err: Error, _req: Request, res: Response, next: NextFunction) {
  if (!(err instanceof ZodError)) {
    return next(err);
  }

  res.status(422).json({
    error: {
      domain: "VALIDATION_ERROR",
      code: "INVALID_INPUT",
      message: "Invalid input data",
      details: err.errors.map((error) => ({
        path: error.path.join("."),
        message: error.message,
      })),
    },
  });
}

function generalErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  res.status(500).json({
    error: {
      domain: "INTERNAL_SERVER_ERROR",
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
      details: {},
    },
  });
}

export function useMiddleware(app: Application) {
  app.use(jsonParser());
  app.use(zodValidationHandler);
  app.use(serviceErrorHandler);
  app.use(generalErrorHandler);
}
