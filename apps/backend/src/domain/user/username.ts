import { InvalidValueError } from '../shared/domain-error.js';

export class InvalidUsernameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Username must be 3-50 letters, digits, '_' or '.', got ${String(raw)}`);
  }
}

export class Username {
  private constructor(readonly value: string) {}

  static of(raw: unknown): Username {
    if (typeof raw !== 'string' || !/^[A-Za-z0-9_.]{3,50}$/.test(raw)) {
      throw new InvalidUsernameError(raw);
    }
    return new Username(raw);
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
