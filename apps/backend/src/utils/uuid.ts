import { InvalidValueError } from './errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidIdError extends InvalidValueError {
  constructor(label: string, raw: unknown) {
    super(`Invalid ${label}: ${String(raw)}`);
  }
}

// Shared base for typed identifiers. Each subclass declares a private brand so
// a BookId can never be passed where a UserId is expected.
export abstract class Uuid {
  protected constructor(readonly value: string) {}

  protected static parse(raw: unknown, label: string): string {
    if (typeof raw !== 'string' || !UUID_PATTERN.test(raw)) throw new InvalidIdError(label, raw);
    return raw.toLowerCase();
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
