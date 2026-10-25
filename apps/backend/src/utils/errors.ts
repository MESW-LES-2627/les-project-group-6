// Base class for every rule violation raised by the domain. The HTTP layer maps
// each family below to a status code; the domain never knows about HTTP.
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
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
