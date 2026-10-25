import type { Book } from '../domain/book/book.js';

// Shape of a book on the wire. Keeps value objects out of the JSON contract.
export interface BookDto {
  id: string;
  title: string;
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  isCommunityAdded: boolean;
  createdAt: string;
}

export function toBookDto(book: Book): BookDto {
  return {
    id: book.id.value,
    title: book.title.value,
    description: book.description,
    isbn13: book.isbn13?.value ?? null,
    pageCount: book.pageCount?.value ?? null,
    coverUrl: book.coverUrl,
    isCommunityAdded: book.isCommunityAdded,
    createdAt: book.createdAt.toISOString(),
  };
}
