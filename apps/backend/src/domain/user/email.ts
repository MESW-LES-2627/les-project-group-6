import { InvalidValueError } from '../shared/domain-error.js';

export class InvalidEmailError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Invalid email: ${String(raw)}`);
  }
}

export class Email {
  private constructor(readonly value: string) {}

  static of(raw: unknown): Email {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
