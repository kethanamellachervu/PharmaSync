import { Request, Response, NextFunction } from 'express';

/**
 * Standard security headers middleware adhering to OWASP best practices.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Mitigate clickjacking attacks
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent cross-site scripting filter bypasses
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer header security
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict unnecessary browser features and APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Hide server platform identification
  res.removeHeader('X-Powered-By');

  // Enforce HTTPS HSTS header in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
