import { InvalidValueError } from '../shared/domain-error.js';
import type { PageCount } from '../book/page-count.js';

export class InvalidPageProgressError extends InvalidValueError {}

// The page a reader has reached. When the book's page count is known, the
// progress can never go beyond it.
export class PageProgress {
  private constructor(readonly page: number) {}

  static of(raw: unknown, total: PageCount | null = null): PageProgress {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
      throw new InvalidPageProgressError('currentPage must be a non-negative integer');
    }
    if (total && raw > total.value) {
      throw new InvalidPageProgressError(
        `currentPage ${raw} exceeds the book's ${total.value} pages`,
      );
    }
    return new PageProgress(raw);
  }

  static zero(): PageProgress {
    return new PageProgress(0);
  }

  equals(other: PageProgress): boolean {
    return this.page === other.page;
  }
}
