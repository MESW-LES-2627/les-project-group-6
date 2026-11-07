// Base class for every rule violation raised by the domain. The HTTP layer maps
// each family below to a status code; the domain never knows about HTTP.
export abstract class DomainError extends Error {
  /** Optional machine-readable code the client can branch on (e.g. `PROFILE_REQUIRED`). */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** A value does not satisfy the rules of its concept (e.g. a malformed ISBN). */
export class InvalidValueError extends DomainError {}

/** The requested aggregate does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super(`${entity} not found`);
  }
}

/** The operation is not allowed in the current state of the aggregate. */
export class BusinessRuleViolationError extends DomainError {}

/** The caller is known but may not act on this aggregate (e.g. not a member of the group). */
export class ForbiddenError extends DomainError {}

/** The request carries no valid session (missing, malformed or expired token). */
export class UnauthenticatedError extends DomainError {
  constructor(message = 'You need to log in') {
    super(message, 'UNAUTHENTICATED');
  }
}
