<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import ProfileBookplate from '@/components/profile/ProfileBookplate.vue';
import ChallengesSummary from '@/components/profile/ChallengesSummary.vue';
import ChapterLevel from '@/components/profile/ChapterLevel.vue';
import CoverGrid from '@/components/profile/CoverGrid.vue';
import CurrentlyReading from '@/components/profile/CurrentlyReading.vue';
import FolderList from '@/components/profile/FolderList.vue';
import MonthRecap from '@/components/profile/MonthRecap.vue';
import ReadingTime from '@/components/profile/ReadingTime.vue';
import BookShelf from '@/components/profile/BookShelf.vue';
import ReviewList from '@/components/profile/ReviewList.vue';
import StreakCalendar from '@/components/profile/StreakCalendar.vue';
import { mockProfile } from '@/mocks/profile';
import {
  getLibraryFolders,
  getMe,
  getReadingStats,
  getUserLibrary,
  getUserProfile,
  getUserReviews,
  type ApiLibraryItem,
  type ApiProfileReview,
  type ApiReadingStats,
} from '@/services/api';
import type { FolderSummary } from '@/types/library';
import type { ProfileUser } from '@/types/profile';
import {
  currentlyReadingFrom,
  foldersFrom,
  recentlyAddedFrom,
  shelfFrom,
  toProfileUser,
} from '@/utils/profile';

// The reader, their books, shelf, folders, reading time and reviews come from the API.
// The chapter, streak, challenges won, imported hours and monthly recap are not built
// yet and still come from src/mocks/profile.ts.
const user = ref<ProfileUser | null>(null);
const loadError = ref('');
const library = ref<ApiLibraryItem[]>([]);
const folderSummaries = ref<FolderSummary[]>([]);
const readingStats = ref<ApiReadingStats>({ totalMinutes: 0, sessionsCount: 0 });
// F-LIB-02: my rated books. `null` (hidden) when the API cannot be reached or refuses.
const reviews = ref<ApiProfileReview[] | null>(null);

const currentlyReading = computed(() => currentlyReadingFrom(library.value));
const shelf = computed(() => shelfFrom(library.value));
const recentlyAdded = computed(() => recentlyAddedFrom(library.value));
const folders = computed(() => foldersFrom(folderSummaries.value, library.value));
const readingTime = computed(() => ({
  countedMinutes: readingStats.value.totalMinutes,
  sessionsCount: readingStats.value.sessionsCount,
  importedHours: mockProfile.importedHours,
}));

async function loadUser() {
  try {
    const me = await getMe();
    const [profile, mine] = await Promise.all([
      getUserProfile(me.username).catch(() => null),
      getUserReviews(me.id).catch(() => null),
    ]);
    user.value = toProfileUser(me, profile?.bio ?? null);
    reviews.value = mine;
  } catch {
    loadError.value = 'We could not load your profile. Please refresh the page.';
  }
}

// Each section keeps its empty state when its request fails.
onMounted(async () => {
  void loadUser();
  const [items, folderList, stats] = await Promise.all([
    getUserLibrary().catch(() => []),
    getLibraryFolders().catch(() => []),
    getReadingStats().catch(() => null),
  ]);
  library.value = items;
  folderSummaries.value = folderList;
  if (stats) readingStats.value = stats;
});
</script>

<template>
  <main class="profile">
    <ProfileBookplate v-if="user" :user="user" />
    <p v-else-if="loadError" class="page-column load-error" role="alert">{{ loadError }}</p>

    <div class="page-column">
      <CurrentlyReading :items="currentlyReading" />

      <div class="columns">
        <div class="column">
          <BookShelf class="divided" :spines="shelf" />
          <CoverGrid :books="recentlyAdded" />
        </div>
        <div class="column">
          <ChapterLevel class="divided" :chapter="mockProfile.chapter" />
          <StreakCalendar class="divided" :streak="mockProfile.streak" />
          <ReadingTime class="divided" :stats="readingTime" />
          <ChallengesSummary :won="mockProfile.challengesWon" />
        </div>
      </div>

      <FolderList class="top-rule" :folders="folders" />
      <ReviewList v-if="reviews" class="top-rule" :reviews="reviews" />
      <MonthRecap class="top-rule" :recap="mockProfile.recap" />
    </div>
  </main>
</template>

<style scoped>
/* The bookplate runs edge to edge, so drop the default main padding */
.profile {
  padding: 0;
}

/* The profile name and section titles use Inter; book titles (h3) keep Lora */
.profile :deep(:is(h1, h2)) {
  font-family: var(--font-body);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  column-gap: 64px;
  border-top: 1px solid var(--color-border);
}

.column {
  min-width: 0;
}

.divided {
  border-bottom: 1px solid var(--color-border);
}

.top-rule {
  border-top: 1px solid var(--color-border);
}

.load-error {
  padding-block: var(--space-12);
}

@media (max-width: 899px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Stacked, the left column needs a rule before the right one starts */
  .column:first-child {
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
