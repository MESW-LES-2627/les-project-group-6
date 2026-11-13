import type { Review } from './review.js';

// Shape of a saved review on the wire. The author is the caller, so it is not repeated.
export interface ReviewDto {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toReviewDto(review: Review): ReviewDto {
  return {
    id: review.id.value,
    bookId: review.bookId.value,
    rating: review.rating.value,
    comment: review.comment.text,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
