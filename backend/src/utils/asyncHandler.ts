import { Router, Request, Response, NextFunction } from 'express';

/**
 * Async route handler wrapper to catch errors
 * Eliminates need for try-catch in every route
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Route error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    });
  };
};
