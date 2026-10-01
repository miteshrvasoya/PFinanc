import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userId: (req as any).user?.userId || 'anonymous',
    };
    
    // Determine log level based on status code
    if (res.statusCode >= 500) {
      console.error(`[API ERROR] ${logData.method} ${logData.url} ${logData.status} - ${logData.duration}`, logData);
    } else if (res.statusCode >= 400) {
      console.warn(`[API WARN] ${logData.method} ${logData.url} ${logData.status} - ${logData.duration}`, logData);
    } else {
      console.log(`[API INFO] ${logData.method} ${logData.url} ${logData.status} - ${logData.duration}`);
    }
  });

  next();
};
