import { Request, Response, NextFunction } from 'express';

/** Postgres SQLSTATE codes that indicate a client error rather than a server fault. */
const PG_CLIENT_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '22P02': { status: 400, code: 'INVALID_INPUT', message: 'Invalid identifier or value format' },
  '22007': { status: 400, code: 'INVALID_INPUT', message: 'Invalid date value' },
  '22008': { status: 400, code: 'INVALID_INPUT', message: 'Date value out of range' },
  '22003': { status: 400, code: 'INVALID_INPUT', message: 'Numeric value out of range' },
  '23502': { status: 400, code: 'MISSING_REQUIRED_FIELD', message: 'A required field is missing' },
  '23503': { status: 400, code: 'INVALID_REFERENCE', message: 'Referenced record does not exist or is still in use' },
  '23505': { status: 409, code: 'DUPLICATE_RECORD', message: 'A record with these details already exists' },
  '23514': { status: 400, code: 'CONSTRAINT_VIOLATION', message: 'Value violates a data rule' },
};

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const pgError = typeof err?.code === 'string' && !err.status ? PG_CLIENT_ERRORS[err.code] : undefined;

  const statusCode = pgError?.status || err.status || err.statusCode || 500;
  const errorCode = pgError?.code || err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = pgError
    ? `${pgError.message}${err.constraint ? ` (${err.constraint})` : ''}`
    : err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    console.error('Unhandled Application Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}
