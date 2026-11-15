import crypto from 'node:crypto';
import { InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { UserId } from '../user/user.js';

export class TagId extends Uuid {
  declare private readonly brand: 'TagId';

  static of(raw: unknown): TagId {
    return new TagId(Uuid.parse(raw, 'tag id'));
  }

  static generate(): TagId {
    return new TagId(crypto.randomUUID());
  }
}

export class InvalidTagNameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Tag name must have between 1 and 40 characters, got ${String(raw)}`);
  }
}

/** A free tag such as "borrowed" or "audiobook", trimmed and stored in lower case. */
export class TagName {
  private constructor(readonly value: string) {}

  static of(raw: unknown): TagName {
    const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').toLowerCase() : '';
    if (name.length === 0 || name.length > 40) throw new InvalidTagNameError(raw);
    return new TagName(name);
  }

  equals(other: TagName): boolean {
    return this.value === other.value;
  }
}

export interface TagState {
  id: TagId;
  userId: UserId;
  name: TagName;
  createdAt: Date;
}

// Aggregate root: one reader's private tag. Like folders, it does not know which
// books carry it; that is the separate book_tags relation.
export class Tag {
  readonly id: TagId;
  readonly userId: UserId;
  readonly name: TagName;
  readonly createdAt: Date;

  private constructor(state: TagState) {
    this.id = state.id;
    this.userId = state.userId;
    this.name = state.name;
    this.createdAt = state.createdAt;
  }

  static create(props: { userId: UserId; name: TagName }): Tag {
    return new Tag({ id: TagId.generate(), ...props, createdAt: new Date() });
  }

  /** Rebuilds a tag that already exists (used by the repository). */
  static reconstitute(state: TagState): Tag {
    return new Tag(state);
  }
}
