import { InvalidValueError } from '../shared/domain-error.js';

export class InvalidBookTitleError extends InvalidValueError {
  constructor() {
    super('Title is required');
  }
}

export class BookTitle {
  private constructor(readonly value: string) {}

  static of(raw: unknown): BookTitle {
    const title = typeof raw === 'string' ? raw.trim() : '';
    if (title === '') throw new InvalidBookTitleError();
    return new BookTitle(title);
  }

  equals(other: BookTitle): boolean {
    return this.value === other.value;
  }
}
