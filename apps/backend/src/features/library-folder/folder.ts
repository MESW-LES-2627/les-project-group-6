import crypto from 'node:crypto';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { UserId } from '../user/user.js';

export class FolderId extends Uuid {
  declare private readonly brand: 'FolderId';

  static of(raw: unknown): FolderId {
    return new FolderId(Uuid.parse(raw, 'folder id'));
  }

  static generate(): FolderId {
    return new FolderId(crypto.randomUUID());
  }
}

export class InvalidFolderNameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Folder name must have between 1 and 100 characters, got ${String(raw)}`);
  }
}

/** A folder name as the reader typed it, trimmed; uniqueness ignores case. */
export class FolderName {
  private constructor(readonly value: string) {}

  static of(raw: unknown): FolderName {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length === 0 || name.length > 100) throw new InvalidFolderNameError(raw);
    return new FolderName(name);
  }

  equals(other: FolderName): boolean {
    return this.value === other.value;
  }

  /** `Summer 2026` and `summer 2026` are the same folder for one reader. */
  matches(other: FolderName): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export class FolderNameTakenError extends BusinessRuleViolationError {
  constructor() {
    super('You already have a folder with this name', 'FOLDER_NAME_TAKEN');
  }
}

export interface NewFolderProps {
  userId: UserId;
  name: FolderName;
}

export interface FolderState {
  id: FolderId;
  userId: UserId;
  name: FolderName;
  createdAt: Date;
}

// Aggregate root: one reader's private folder. It references the reader by id
// and does not know which books it holds; memberships are a separate relation.
export class Folder {
  readonly id: FolderId;
  readonly userId: UserId;
  private _name: FolderName;
  readonly createdAt: Date;

  private constructor(state: FolderState) {
    this.id = state.id;
    this.userId = state.userId;
    this._name = state.name;
    this.createdAt = state.createdAt;
  }

  static create(props: NewFolderProps): Folder {
    return new Folder({
      id: FolderId.generate(),
      userId: props.userId,
      name: props.name,
      createdAt: new Date(),
    });
  }

  /** Rebuilds a folder that already exists (used by the repository). */
  static reconstitute(state: FolderState): Folder {
    return new Folder(state);
  }

  get name(): FolderName {
    return this._name;
  }

  rename(name: FolderName): void {
    this._name = name;
  }
}
