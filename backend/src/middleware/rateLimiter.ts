import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Creates an in-memory sliding-window rate limiter without external dependencies.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const hits = new Map<string, RateLimitRecord>();
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  // Periodic cleanup of expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Resolve client IP address safely
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      res.status(429).json({
        status: 'error',
        message,
        retryAfterSeconds: resetSeconds,
      });
      return;
    }

    next();
  };
}

// Global API rate limit: 1000 requests per 15 minutes
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded. Please slow down your requests.',
});

// Sensitive mutation rate limit: 150 mutations (POST/PUT/DELETE/PATCH) per minute
export const mutationRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return sensitiveRateLimiter(req, res, next);
  }
  next();
};

const sensitiveRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'Too many inventory/transaction modification requests. Please wait a moment before trying again.',
});
