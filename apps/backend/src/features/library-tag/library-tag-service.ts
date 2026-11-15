import { NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import type { LibraryMembership } from '../library-folder/library-membership.js';
import { UserId } from '../user/user.js';
import { Tag, TagId, TagName } from './tag.js';
import type { ITagRepository, TagView } from './tag-repository.js';

export interface TagBookCommand {
  userId: unknown;
  bookId: unknown;
  name: unknown;
}

export interface UntagBookCommand {
  userId: unknown;
  bookId: unknown;
  tagId: unknown;
}

// Application service: tags are created on first use and removed once no book in
// the reader's library carries them, so the sidebar never lists empty tags.
export class LibraryTagService {
  constructor(
    private readonly tags: ITagRepository,
    private readonly library: LibraryMembership,
  ) {}

  async list(userId: unknown): Promise<TagView[]> {
    return this.tags.listForUser(UserId.of(userId));
  }

  async tagBook(command: TagBookCommand): Promise<TagView> {
    const userId = UserId.of(command.userId);
    const bookId = BookId.of(command.bookId);
    const name = TagName.of(command.name);

    if (!(await this.library.contains(userId, bookId))) {
      throw new NotFoundError('Book in your library');
    }

    const tag =
      (await this.tags.findByName(userId, name)) ??
      (await this.tags.saveOrFind(Tag.create({ userId, name })));
    // Tagging a book twice with the same tag is a no-op.
    await this.tags.addBook(tag.id, bookId);

    return { id: tag.id.value, name: tag.name.value, count: await this.tags.countBooks(tag.id) };
  }

  async untagBook(command: UntagBookCommand): Promise<void> {
    const userId = UserId.of(command.userId);
    const tag = await this.tags.findById(TagId.of(command.tagId));
    // Someone else's tag is reported as not found, so its id is not revealed.
    if (!tag || !tag.userId.equals(userId)) throw new NotFoundError('Tag');

    await this.tags.removeBook(tag.id, BookId.of(command.bookId));
    if ((await this.tags.countBooks(tag.id)) === 0) await this.tags.delete(tag.id);
  }
}
