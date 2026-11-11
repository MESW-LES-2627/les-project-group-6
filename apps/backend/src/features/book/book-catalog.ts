/** A book found in an outside catalogue, already checked: the ISBN-13 is valid. */
export interface CatalogBook {
  title: string;
  isbn13: string;
  authors: string[];
  description: string | null;
  pageCount: number | null;
  coverUrl: string | null;
}

/**
 * Port to an outside book catalogue (Open Library today). Never throws: when the
 * catalogue is down or slow it answers with no books.
 */
export interface BookCatalog {
  search(query: string, limit: number): Promise<CatalogBook[]>;
}
