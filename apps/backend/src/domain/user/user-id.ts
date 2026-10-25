import crypto from 'node:crypto';
import { Uuid } from '../shared/uuid.js';

export class UserId extends Uuid {
  declare private readonly brand: 'UserId';

  static of(raw: unknown): UserId {
    return new UserId(Uuid.parse(raw, 'user id'));
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }
}
