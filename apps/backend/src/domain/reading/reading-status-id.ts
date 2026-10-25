import crypto from 'node:crypto';
import { Uuid } from '../shared/uuid.js';

export class ReadingStatusId extends Uuid {
  declare private readonly brand: 'ReadingStatusId';

  static of(raw: unknown): ReadingStatusId {
    return new ReadingStatusId(Uuid.parse(raw, 'reading status id'));
  }

  static generate(): ReadingStatusId {
    return new ReadingStatusId(crypto.randomUUID());
  }
}
