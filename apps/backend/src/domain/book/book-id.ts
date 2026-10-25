import crypto from 'node:crypto';
import { Uuid } from '../shared/uuid.js';

export class BookId extends Uuid {
  declare private readonly brand: 'BookId';

  static of(raw: unknown): BookId {
    return new BookId(Uuid.parse(raw, 'book id'));
  }

  static generate(): BookId {
    return new BookId(crypto.randomUUID());
  }
}
