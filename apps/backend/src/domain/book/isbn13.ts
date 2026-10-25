import { InvalidValueError } from '../shared/domain-error.js';

export class InvalidIsbnError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Invalid ISBN-13: ${String(raw)}`);
  }
}

export class Isbn13 {
  private constructor(readonly value: string) {}

  // Accepts hyphens or spaces and checks the ISBN-13 check digit (weights 1 and 3).
  static of(raw: unknown): Isbn13 {
    if (typeof raw !== 'string') throw new InvalidIsbnError(raw);
    const digits = raw.replace(/[-\s]/g, '');
    if (!/^\d{13}$/.test(digits)) throw new InvalidIsbnError(raw);

    const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    if (sum % 10 !== 0) throw new InvalidIsbnError(raw);

    return new Isbn13(digits);
  }

  equals(other: Isbn13): boolean {
    return this.value === other.value;
  }
}
