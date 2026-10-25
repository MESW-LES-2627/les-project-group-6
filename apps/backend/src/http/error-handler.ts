import type { ErrorRequestHandler } from 'express';
import {
  BusinessRuleViolationError,
  InvalidValueError,
  NotFoundError,
} from '../domain/shared/domain-error.js';

// Maps domain error families to HTTP status codes. Express 5 forwards rejected
// async handlers here, so routes can simply let domain errors propagate.
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
  } else if (error instanceof InvalidValueError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof BusinessRuleViolationError) {
    res.status(409).json({ error: error.message });
  } else if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Malformed JSON body' });
  } else {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
