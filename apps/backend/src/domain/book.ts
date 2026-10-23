import crypto from 'node:crypto';

export interface IBookRepository {
  findById(id: string): Promise<Book | null>;
  findByTitle(title: string): Promise<Book[]>;
  save(book: Book): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export interface BookProps {
  id?: string;
  title: string;
  description?: string | null;
  isbn13?: string | null;
  pageCount?: number | null;
  coverUrl?: string | null;
  isCommunityAdded?: boolean;
  createdAt?: Date;
}

export class Book {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isbn13: string | null;
  readonly pageCount: number | null;
  readonly coverUrl: string | null;
  readonly isCommunityAdded: boolean;
  readonly createdAt: Date;

  constructor(props: BookProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.title = props.title;
    this.description = props.description ?? null;
    this.isbn13 = props.isbn13 ?? null;
    this.pageCount = props.pageCount ?? null;
    this.coverUrl = props.coverUrl ?? null;
    this.isCommunityAdded = props.isCommunityAdded ?? false;
    this.createdAt = props.createdAt ?? new Date();
  }
}
