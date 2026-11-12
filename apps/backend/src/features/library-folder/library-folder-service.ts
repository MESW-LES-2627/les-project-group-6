import { NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { Folder, FolderId, FolderName, FolderNameTakenError } from './folder.js';
import type { FolderView, IFolderRepository } from './folder-repository.js';
import type { LibraryMembership } from './library-membership.js';

export interface CreateFolderCommand {
  userId: unknown;
  name: unknown;
}

export interface RenameFolderCommand {
  userId: unknown;
  folderId: unknown;
  name: unknown;
}

export interface FolderCommand {
  userId: unknown;
  folderId: unknown;
}

export interface FolderBookCommand extends FolderCommand {
  bookId: unknown;
}

// Application service: every use case is scoped to the signed-in reader. A folder
// that belongs to someone else is reported as not found, so its id is not revealed.
export class LibraryFolderService {
  constructor(
    private readonly folders: IFolderRepository,
    private readonly library: LibraryMembership,
  ) {}

  async list(userId: unknown): Promise<FolderView[]> {
    return this.folders.listForUser(UserId.of(userId));
  }

  async create(command: CreateFolderCommand): Promise<FolderView> {
    const userId = UserId.of(command.userId);
    const name = FolderName.of(command.name);
    await this.ensureNameAvailable(userId, name);

    const folder = Folder.create({ userId, name });
    await this.folders.save(folder);
    return this.toView(folder);
  }

  async rename(command: RenameFolderCommand): Promise<FolderView> {
    const userId = UserId.of(command.userId);
    const folder = await this.ownedFolder(command.folderId, userId);
    const name = FolderName.of(command.name);

    // A case-only rename still updates how the folder is shown.
    if (!folder.name.equals(name)) {
      await this.ensureNameAvailable(userId, name, folder.id);
      folder.rename(name);
      await this.folders.save(folder);
    }

    return this.toView(folder);
  }

  async remove(command: FolderCommand): Promise<void> {
    const folder = await this.ownedFolder(command.folderId, UserId.of(command.userId));
    // list_books cascades, so the books stay in the reader's library.
    await this.folders.delete(folder.id);
  }

  async addBook(command: FolderBookCommand): Promise<void> {
    const userId = UserId.of(command.userId);
    const folder = await this.ownedFolder(command.folderId, userId);
    const bookId = BookId.of(command.bookId);

    if (!(await this.library.contains(userId, bookId))) {
      throw new NotFoundError('Book in your library');
    }

    // Adding the same book twice is a no-op: a book can be in several folders.
    await this.folders.addBook(folder.id, bookId);
  }

  async removeBook(command: FolderBookCommand): Promise<void> {
    const folder = await this.ownedFolder(command.folderId, UserId.of(command.userId));
    await this.folders.removeBook(folder.id, BookId.of(command.bookId));
  }

  private async ownedFolder(rawId: unknown, userId: UserId): Promise<Folder> {
    const folder = await this.folders.findById(FolderId.of(rawId));
    if (!folder || !folder.userId.equals(userId)) throw new NotFoundError('Folder');
    return folder;
  }

  private async ensureNameAvailable(
    userId: UserId,
    name: FolderName,
    current?: FolderId,
  ): Promise<void> {
    const existing = await this.folders.findByName(userId, name);
    if (existing && !(current && existing.id.equals(current))) {
      throw new FolderNameTakenError();
    }
  }

  private async toView(folder: Folder): Promise<FolderView> {
    return {
      id: folder.id.value,
      name: folder.name.value,
      count: await this.folders.countBooks(folder.id),
      createdAt: folder.createdAt.toISOString(),
    };
  }
}
