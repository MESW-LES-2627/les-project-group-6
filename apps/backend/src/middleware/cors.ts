import type { RequestHandler } from 'express';

/**
 * CORS for the browser clients. With an allow-list, only those origins are
 * answered (and `Vary: Origin` keeps caches per origin); with an empty list,
 * any origin is allowed, for local development. Tokens travel in the
 * Authorization header, never in cookies, so credentials are not allowed.
 */
export function corsFor(allowedOrigins: readonly string[] = []): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (allowed.size === 0) {
      res.header('Access-Control-Allow-Origin', '*');
    } else {
      res.vary('Origin');
      const origin = req.headers.origin;
      if (origin && allowed.has(origin)) res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  };
}
