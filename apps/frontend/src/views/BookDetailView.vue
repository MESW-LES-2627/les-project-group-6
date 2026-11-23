<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import PageSkeleton from '@/components/layout/PageSkeleton.vue';
import BookEditionPanel from '@/components/library/BookEditionPanel.vue';
import BookReadingPanel from '@/components/library/BookReadingPanel.vue';
import BookThoughtsPanel from '@/components/library/BookThoughtsPanel.vue';
import ReadingClubPanel from '@/components/library/ReadingClubPanel.vue';
import ReviewItem from '@/components/library/ReviewItem.vue';
import {
  getBook,
  getBookReviews,
  getLibraryFolders,
  getLibraryTags,
  getUserBookClubs,
  getUserLibrary,
  mapApiBookToDetail,
  mapApiBookToLibraryBook,
  mapApiLibraryItemToBook,
  type ApiBookReviews,
  type ApiReview,
} from '@/services/api';
import type {
  BookDetail,
  FolderSummary,
  LibraryBook,
  ReadingStatus,
  TagSummary,
} from '@/types/library';

const props = defineProps<{ bookId: string }>();

// Everything comes from the API; an unknown book or a failed request shows "Book not found".
const book = ref<LibraryBook | null>(null);
const detail = ref<BookDetail | null>(null);
const folders = ref<FolderSummary[]>([]);
const tags = ref<TagSummary[]>([]);
/** True while the book itself loads; reviews and tags have their own quiet failures. */
const loading = ref(true);

async function fetchBookData() {
  loading.value = true;
  try {
    const [libraryItems, clubs] = await Promise.all([
      getUserLibrary(),
      getUserBookClubs().catch(() => []),
    ]);
    const item = libraryItems.find((i) => i.book.id === props.bookId);
    const source = item?.book ?? (await getBook(props.bookId));
    book.value = item ? mapApiLibraryItemToBook(item) : mapApiBookToLibraryBook(source);
    detail.value = mapApiBookToDetail(source, clubs);
  } catch {
    book.value = null;
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

// F-LIB-02: my review, my friends' reviews and the public reviews of this book.
const reviews = ref<ApiBookReviews | null>(null);

async function loadReviews() {
  try {
    reviews.value = await getBookReviews(props.bookId);
  } catch {
    // An unknown book has no reviews; show the empty states.
    reviews.value = null;
  }
}

async function fetchFolders() {
  try {
    folders.value = await getLibraryFolders();
  } catch {
    folders.value = [];
  }
}

async function fetchTags() {
  try {
    tags.value = await getLibraryTags();
  } catch {
    tags.value = [];
  }
}

onMounted(() => {
  void fetchBookData();
  void loadReviews();
  void fetchFolders();
  void fetchTags();
});

watch(
  () => props.bookId,
  () => {
    void fetchBookData();
    void loadReviews();
  },
);

function onStatusUpdated(updated: {
  status: ReadingStatus;
  currentPage: number;
  startedOn?: string | null;
  finishedOn?: string | null;
}) {
  if (!book.value) return;
  book.value = { ...book.value, ...updated };
}

function onFoldersUpdated(folderIds: string[]) {
  if (book.value) book.value = { ...book.value, folderIds: [...folderIds] };
}

function setTagIds(tagIds: string[]) {
  if (book.value) book.value = { ...book.value, tagIds };
}

function onTagAdded(tag: TagSummary) {
  if (!book.value) return;
  // Adding the same tag twice is a no-op in the API, so keep the ids unique here too.
  if (!tags.value.some((known) => known.id === tag.id)) tags.value = [...tags.value, tag];
  if (!book.value.tagIds.includes(tag.id)) setTagIds([...book.value.tagIds, tag.id]);
}

function onTagRemoved(tagId: string) {
  if (!book.value) return;
  setTagIds(book.value.tagIds.filter((id) => id !== tagId));
}

const friendReviews = computed(() => reviews.value?.friends ?? []);
const publicReviews = computed(() => reviews.value?.publicReviews ?? []);
const publicRating = computed(() => reviews.value?.publicAverage?.toFixed(1) ?? '—');
const publicRatingCount = computed(() => {
  const count = reviews.value?.publicCount ?? 0;
  if (count === 0) return 'No public ratings yet';
  return `${count.toLocaleString('en-US')} public rating${count === 1 ? '' : 's'}`;
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

const reviewDate = (review: ApiReview) =>
  new Date(review.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const mailtoHref = computed(() => {
  if (!book.value) return '';
  const subject = `A book recommendation: ${book.value.title}`;
  const by = book.value.author ? ` by ${book.value.author}` : '';
  const body = `I thought you might like ${book.value.title}${by}.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
</script>

<template>
  <main class="book-detail">
    <div class="page-column">
      <PageSkeleton v-if="loading" cover label="Loading the book…" />

      <template v-else-if="book && detail">
        <header class="detail-hero">
          <div class="hero-copy">
            <p class="eyebrow">
              <RouterLink :to="{ name: 'library' }">Library</RouterLink>
              <span aria-hidden="true">/</span>
              Book details
            </p>
            <h1 class="hero-title">{{ book.title }}</h1>
            <p v-if="detail.tagline" class="subtitle">{{ detail.tagline }}</p>
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
              :folders="folders"
              :tags="tags"
              @updated="onStatusUpdated"
              @library-changed="fetchBookData"
              @folders-updated="onFoldersUpdated"
              @tag-added="onTagAdded"
              @tag-removed="onTagRemoved"
            />

            <section class="about-section" aria-labelledby="about-title">
              <h2 id="about-title" class="section-title">About this book</h2>
              <p v-if="detail.synopsis" class="synopsis">{{ detail.synopsis }}</p>
              <p v-else class="empty-copy">No description yet.</p>
            </section>

            <section class="friends-panel" aria-labelledby="friends-title">
              <div class="section-head">
                <h2 id="friends-title" class="section-title">What your friends thought</h2>
                <span v-if="friendReviews.length > 0" class="friends-link">
                  {{ friendReviews.length }} friend{{ friendReviews.length === 1 ? '' : 's' }}
                </span>
              </div>

              <div v-if="friendReviews.length > 0" class="friends-list">
                <ReviewItem
                  v-for="review in friendReviews"
                  :key="review.id"
                  :initials="initials(review.author.displayName)"
                  :name="review.author.displayName"
                  :rating="review.rating"
                  :meta="reviewDate(review)"
                  :quote="review.comment"
                />
              </div>
              <p v-else class="empty-copy">No friend reviews yet.</p>

              <p v-if="friendReviews.length > 0" class="friend-note">
                Friends' reviews show whatever their profile setting. Only public profiles count in
                the public average.
              </p>
            </section>

            <section class="reviews-panel" aria-labelledby="reviews-title">
              <h2 id="reviews-title" class="section-title">Public reviews</h2>

              <div class="reviews-summary">
                <div class="rating-summary">
                  <p class="big-rating">{{ publicRating }} / 5</p>
                  <p class="rating-count">{{ publicRatingCount }}</p>
                </div>
              </div>

              <div v-if="publicReviews.length > 0" class="public-list">
                <ReviewItem
                  v-for="review in publicReviews"
                  :key="review.id"
                  :initials="initials(review.author.displayName)"
                  :name="review.author.displayName"
                  :rating="review.rating"
                  :meta="`Public review • ${reviewDate(review)}`"
                  :quote="review.comment"
                />
              </div>
              <p v-else class="empty-copy">No public reviews yet.</p>
            </section>
          </div>

          <aside class="rail">
            <BookThoughtsPanel
              :book-id="bookId"
              :status="book.status"
              :review="reviews?.mine ?? null"
              @changed="loadReviews"
            />
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
  font-family: var(--font-heading);
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
  color: var(--color-copper);
  font-size: 0.625rem;
  font-weight: var(--font-weight-semibold);
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

  .big-rating {
    font-size: var(--font-size-lg);
  }

  .section-head {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
}
</style>
