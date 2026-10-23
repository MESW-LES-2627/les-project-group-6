<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import BookEditionPanel from '@/components/library/BookEditionPanel.vue';
import BookReadingPanel from '@/components/library/BookReadingPanel.vue';
import BookThoughtsPanel from '@/components/library/BookThoughtsPanel.vue';
import ReadingClubPanel from '@/components/library/ReadingClubPanel.vue';
import ReviewItem from '@/components/library/ReviewItem.vue';
import { getBookDetail, mockLibrary } from '@/mocks/library';
import {
  getBook,
  getUserLibrary,
  mapApiBookToLibraryBook,
  mapApiLibraryItemToBook,
} from '@/services/api';
import type { LibraryBook, ReadingStatus } from '@/types/library';

const props = defineProps<{ bookId: string }>();

const apiBook = ref<LibraryBook | null>(null);

const book = computed(() => {
  if (apiBook.value) return apiBook.value;
  return mockLibrary.books.find((item) => item.id === props.bookId) ?? null;
});

const detail = computed(() => (book.value ? getBookDetail(book.value) : null));

async function fetchBookData() {
  try {
    const libraryItems = await getUserLibrary();
    const item = libraryItems.find((i) => i.book.id === props.bookId);
    if (item) {
      apiBook.value = mapApiLibraryItemToBook(item);
      return;
    }

    const fetched = await getBook(props.bookId);
    if (fetched) {
      apiBook.value = mapApiBookToLibraryBook(fetched);
    }
  } catch {
    // Keep mock fallback
  }
}

onMounted(() => {
  void fetchBookData();
});

watch(
  () => props.bookId,
  () => {
    void fetchBookData();
  },
);

function onStatusUpdated(updated: { status: ReadingStatus; currentPage: number }) {
  if (apiBook.value) {
    apiBook.value = {
      ...apiBook.value,
      status: updated.status,
      currentPage: updated.currentPage,
    };
  } else if (book.value) {
    book.value.status = updated.status;
    book.value.currentPage = updated.currentPage;
  }
}

const folders = computed(() => {
  if (!book.value) return [];
  return mockLibrary.folders
    .filter((folder) => book.value?.folderIds.includes(folder.id))
    .map((folder) => folder.name);
});

const tags = computed(() => {
  if (!book.value) return [];
  return mockLibrary.tags
    .filter((tag) => book.value?.tagIds.includes(tag.id))
    .map((tag) => tag.name);
});

const friendCount = computed(() => detail.value?.friendCount ?? detail.value?.friends.length ?? 0);
const publicRating = computed(() => detail.value?.publicRating.toFixed(1) ?? '0.0');
const publicRatingCount = computed(
  () => detail.value?.publicRatingCount.toLocaleString('en-US') ?? '0',
);

const mailtoHref = computed(() => {
  if (!book.value) return '';
  const subject = `A book recommendation: ${book.value.title}`;
  const body = `I thought you might like ${book.value.title} by ${book.value.author}.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
</script>

<template>
  <main class="book-detail">
    <div class="page-column">
      <template v-if="book && detail">
        <header class="detail-hero">
          <div class="hero-copy">
            <p class="eyebrow">
              <RouterLink :to="{ name: 'library' }">Library</RouterLink>
              <span aria-hidden="true">/</span>
              Book details
            </p>
            <h1 class="hero-title">{{ book.title }}</h1>
            <p class="subtitle">{{ detail.tagline }}</p>
          </div>

          <a class="send-link" :href="mailtoHref">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            Send to a friend
          </a>
        </header>

        <div class="detail-layout">
          <BookEditionPanel :book="book" :edition="detail.edition" />

          <div class="main-column">
            <BookReadingPanel
              :book="book"
              :detail="detail"
              :folders="folders"
              :tags="tags"
              @updated="onStatusUpdated"
            />

            <section class="about-section" aria-labelledby="about-title">
              <h2 id="about-title" class="section-title">About this book</h2>
              <p class="synopsis">{{ detail.synopsis }}</p>
            </section>

            <section class="friends-panel" aria-labelledby="friends-title">
              <div class="section-head">
                <h2 id="friends-title" class="section-title">What your friends thought</h2>
                <button v-if="friendCount > 0" type="button" class="friends-link">
                  {{ friendCount }} friends <span aria-hidden="true">→</span>
                </button>
              </div>

              <div v-if="detail.friends.length > 0" class="friends-list">
                <ReviewItem
                  v-for="review in detail.friends"
                  :key="review.id"
                  :initials="review.initials"
                  :name="review.name"
                  :rating="review.rating"
                  :meta="review.finishedLabel"
                  :quote="review.quote"
                />
              </div>
              <p v-else class="empty-copy">No friend reviews yet.</p>

              <p v-if="detail.friends.length > 0" class="friend-note">
                Friend ratings come first. Friends-only reviews aren't part of the public average.
              </p>
            </section>

            <section class="reviews-panel" aria-labelledby="reviews-title">
              <h2 id="reviews-title" class="section-title">Public reviews</h2>

              <div class="reviews-summary">
                <div class="rating-summary">
                  <p class="big-rating">{{ publicRating }} / 5</p>
                  <p class="rating-count">{{ publicRatingCount }} public ratings</p>
                </div>

                <label class="sort-control">
                  <span class="sort-label">Sort reviews</span>
                  <span class="sort-select">
                    <select aria-label="Sort public reviews">
                      <option>Most helpful</option>
                      <option>Newest</option>
                      <option>Highest rated</option>
                    </select>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </label>
              </div>

              <div v-if="detail.publicReviews.length > 0" class="public-list">
                <ReviewItem
                  v-for="review in detail.publicReviews"
                  :key="review.id"
                  :initials="review.initials"
                  :name="review.name"
                  :rating="review.rating"
                  :meta="`Public review • ${review.helpfulCount} found helpful`"
                  :quote="review.quote"
                />
              </div>
              <p v-else class="empty-copy">No public reviews yet.</p>

              <button type="button" class="read-more">Read more public reviews</button>
            </section>
          </div>

          <aside class="rail">
            <BookThoughtsPanel :detail="detail" />
            <ReadingClubPanel v-if="detail.club" :club="detail.club" :book-title="book.title" />
          </aside>
        </div>
      </template>

      <section v-else class="missing" aria-labelledby="missing-title">
        <p class="eyebrow">Library <span aria-hidden="true">/</span> Book details</p>
        <h1 id="missing-title" class="missing-title">Book not found</h1>
        <p class="missing-copy">
          This book isn't on your shelf yet. Head back to the library to pick another one.
        </p>
        <RouterLink class="button missing-link" :to="{ name: 'library' }">
          Back to library
        </RouterLink>
      </section>
    </div>
  </main>
</template>

<style scoped>
.book-detail {
  padding: 24px 0 40px;
}

.detail-hero {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  align-items: flex-start;
  justify-content: space-between;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 7px;
  color: var(--color-copper);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.eyebrow a {
  color: inherit;
  text-decoration: none;
}

.eyebrow a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.hero-title {
  margin: 0;
  font-size: clamp(var(--font-size-xl), 3vw, var(--font-size-xl));
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.015em;
  line-height: 1.08;
}

.subtitle {
  max-width: 44rem;
  margin: 9px 0 0;
  font-size: var(--font-size-base);
  line-height: 1.5;
}

.send-link {
  display: inline-flex;
  flex: none;
  gap: 7px;
  align-items: center;
  margin-top: 32px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.send-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.detail-layout {
  display: grid;
  grid-template-columns: 247px minmax(0, 1fr) 309px;
  gap: 32px;
  align-items: start;
  margin-top: 25px;
}

.main-column {
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-normal);
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.about-section {
  margin-top: 28px;
}

.synopsis {
  margin: 13px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.friends-panel,
.reviews-panel {
  padding: 19px 20px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.friends-panel {
  margin-top: 24px;
}

.section-head {
  display: flex;
  gap: var(--space-4);
  align-items: baseline;
  justify-content: space-between;
}

.friends-link {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-copper);
  font: inherit;
  font-size: 0.625rem;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.friends-link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin-top: 17px;
}

.friend-note {
  margin: 18px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  line-height: 1.35;
}

.reviews-panel {
  margin-top: 18px;
}

.reviews-summary {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
  margin-top: 18px;
}

.big-rating {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.75rem;
  line-height: 1;
}

.rating-count {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  line-height: 1.3;
}

.sort-control {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.sort-label {
  color: var(--color-text-muted);
  font-size: 0.625rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
}

.sort-select {
  position: relative;
  display: block;
}

.sort-select select {
  padding: 0 16px 0 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
  appearance: none;
}

.sort-select svg {
  position: absolute;
  top: 50%;
  right: 0;
  color: var(--color-text-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.public-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 19px;
}

.empty-copy {
  margin: 18px 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.read-more {
  margin: 26px 0 0 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.625rem;
  cursor: pointer;
}

.read-more:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.rail {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.missing {
  max-width: 36rem;
  padding: 60px 0;
}

.missing-title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.missing-copy {
  margin: 12px 0 22px;
  color: var(--color-text-muted);
}

.missing-link {
  width: fit-content;
}

@media (max-width: 1199px) {
  .detail-layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .rail {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .book-detail {
    padding-top: 20px;
  }

  .detail-hero {
    gap: var(--space-4);
  }

  .send-link {
    margin-top: 0;
  }

  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-8);
  }

  .rail {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .friends-panel,
  .reviews-panel {
    padding: 18px 16px;
  }

  .reviews-summary {
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .sort-control {
    align-items: flex-start;
  }

  .big-rating {
    font-size: var(--font-size-lg);
  }

  .section-head {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
