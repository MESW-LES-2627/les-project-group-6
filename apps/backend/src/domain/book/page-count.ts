import { InvalidValueError } from '../shared/domain-error.js';

export class InvalidPageCountError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Page count must be a positive integer, got ${String(raw)}`);
  }
}

export class PageCount {
  private constructor(readonly value: number) {}

  static of(raw: unknown): PageCount {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
      throw new InvalidPageCountError(raw);
    }
    return new PageCount(raw);
  }

  equals(other: PageCount): boolean {
    return this.value === other.value;
  }
}
