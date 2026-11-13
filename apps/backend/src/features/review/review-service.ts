import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import type { IFriendRepository } from '../friend/friend-repository.js';
import type { IReadingStatusRepository } from '../reading-status/reading-status-repository.js';
import { UserId } from '../user/user.js';
import type { IUserRepository } from '../user/user-repository.js';
import { Rating, Review, ReviewComment, ReviewNotAllowedError } from './review.js';
import type { IReviewRepository } from './review-repository.js';
import type { BookReviewsView, ProfileReviewView, ReviewQuery } from './review-query.js';

export interface WriteReviewCommand {
  userId: unknown;
  bookId: unknown;
  rating: unknown;
  comment?: unknown;
}

// Application service: one method per review use case (F-LIB-02).
export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly readingStatuses: IReadingStatusRepository,
    private readonly books: IBookRepository,
    private readonly users: IUserRepository,
    private readonly friends: IFriendRepository,
    private readonly query: ReviewQuery,
  ) {}

  /** Creates or replaces the reader's review; only books they have started can be reviewed. */
  async write(command: WriteReviewCommand): Promise<Review> {
    const userId = UserId.of(command.userId);
    const bookId = BookId.of(command.bookId);
    const rating = Rating.of(command.rating);
    const comment = ReviewComment.of(command.comment);

    if (!(await this.books.findById(bookId))) throw new NotFoundError('Book');
    const status = await this.readingStatuses.findByUserAndBook(userId, bookId);
    if (!status?.allowsReview) throw new ReviewNotAllowedError();

    const existing = await this.reviews.findByUserAndBook(userId, bookId);
    const review = existing ?? Review.write(userId, bookId, rating, comment);
    if (existing) existing.revise(rating, comment);

    await this.reviews.save(review);
    return review;
  }

  /** Deletes the reader's review; deleting one that does not exist is not an error. */
  async remove(userId: unknown, bookId: unknown): Promise<void> {
    await this.reviews.delete(UserId.of(userId), BookId.of(bookId));
  }

  async forBook(bookId: unknown, viewerId: unknown): Promise<BookReviewsView> {
    const id = BookId.of(bookId);
    if (!(await this.books.findById(id))) throw new NotFoundError('Book');
    return this.query.forBook(id, UserId.of(viewerId));
  }

  /** A profile's reviews follow the profile: public for everyone, private for the owner and friends. */
  async forProfile(profileUserId: unknown, viewerId: unknown): Promise<ProfileReviewView[]> {
    const ownerId = UserId.of(profileUserId);
    const viewer = UserId.of(viewerId);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User');

    const allowed =
      ownerId.equals(viewer) ||
      owner.profileVisibility === 'public' ||
      (await this.friends.areFriends(ownerId, viewer));
    if (!allowed) throw new ForbiddenError('This profile is private');

    return this.query.forUser(ownerId);
  }
}
