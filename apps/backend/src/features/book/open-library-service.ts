export class OpenLibraryService {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async search(query?: string, limit = 5) {
    const trimmed = query?.trim();
    const url = trimmed
      ? `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&fields=title,author_name,cover_edition_key,edition_key,isbn,number_of_pages_median,first_sentence&limit=${limit}`
      : `https://openlibrary.org/trending/daily.json?limit=${limit}`;

    try {
      const res = await this.fetchFn(url);
      if (!res.ok) return [];

      const data = (await res.json()) as Record<string, unknown>;
      const items = Array.isArray(data.docs)
        ? data.docs
        : Array.isArray(data.works)
          ? data.works
          : [];

      return items.slice(0, limit).map((doc: Record<string, unknown>) => {
        const olid =
          (typeof doc.cover_edition_key === 'string' ? doc.cover_edition_key : null) ??
          (Array.isArray(doc.edition_key) && typeof doc.edition_key[0] === 'string'
            ? doc.edition_key[0]
            : null);

        const isbns = Array.isArray(doc.isbn) ? (doc.isbn as unknown[]) : [];
        const isbn13 =
          isbns
            .map((i) => (typeof i === 'string' ? i.replace(/[-\s]/g, '') : ''))
            .find((digits) => /^\d{13}$/.test(digits)) ?? null;

        const sentence = Array.isArray(doc.first_sentence)
          ? doc.first_sentence[0]
          : doc.first_sentence;

        const pages = doc.number_of_pages_median;
        const authors = Array.isArray(doc.author_name) ? doc.author_name : [];
        const authorName = typeof authors[0] === 'string' ? authors[0].trim() : null;

        return {
          title: typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : 'Untitled',
          authorName,
          isbn13,
          pageCount: typeof pages === 'number' && pages > 0 ? pages : null,
          coverUrl: olid ? `https://covers.openlibrary.org/b/olid/${olid}-L.jpg` : null,
          description: typeof sentence === 'string' ? sentence.trim() : null,
        };
      });
    } catch {
      return [];
    }
  }
}
