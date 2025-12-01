import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  if (err.message.includes('duplicate key')) {
    res.status(409).json({
      error: 'Resource already exists',
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error',
  });
}
