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
  getChallengeGroup,
  getLibraryFolders,
  getMe,
  getReadingStats,
  getStreak,
  getUserGroups,
  getUserLibrary,
  getUserProfile,
  getUserReviews,
  type ApiLibraryItem,
  type ApiProfileReview,
  type ApiReadingStats,
  type ApiStreak,
} from '@/services/api';
import type { FolderSummary } from '@/types/library';
import type { ProfileUser, ReadingTimeStats, Streak } from '@/types/profile';
import {
  currentlyReadingFrom,
  foldersFrom,
  recentlyAddedFrom,
  shelfFrom,
  toProfileUser,
  wonChallenge,
} from '@/utils/profile';

// The reader, their books, shelf, folders, streak, reading time and reviews come from the
// API. The user, streak and reading time never fall back to mock data: a failed request
// shows an empty state and an error. Challenges won are counted from the reader's finished
// challenges. The chapter and monthly recap are not
// built yet and still come from src/mocks/profile.ts.
const user = ref<ProfileUser | null>(null);
const library = ref<ApiLibraryItem[]>([]);
const folderSummaries = ref<FolderSummary[]>([]);
const streakData = ref<ApiStreak | null>(null);
const readingStats = ref<ApiReadingStats | null>(null);
// F-LIB-02: my rated books. `null` (hidden) when the API cannot be reached or refuses.
const reviews = ref<ApiProfileReview[] | null>(null);
// #124: finished challenges where the reader holds the top score (ties count for everyone).
const challengesWon = ref(0);
const loadFailed = ref<{ user: boolean; streak: boolean; readingTime: boolean }>({
  user: false,
  streak: false,
  readingTime: false,
});

const EMPTY_STREAK: Streak = { days: [], current: 0, longest: 0, freezesLeft: 0 };
const EMPTY_READING_TIME: ReadingTimeStats = {
  countedMinutes: 0,
  sessionsCount: 0,
  importedHours: 0,
};

const currentlyReading = computed(() => currentlyReadingFrom(library.value));
const shelf = computed(() => shelfFrom(library.value));
const recentlyAdded = computed(() => recentlyAddedFrom(library.value));
const folders = computed(() => foldersFrom(folderSummaries.value, library.value));

const streak = computed<Streak>(() => {
  if (!streakData.value) return EMPTY_STREAK;
  const { days, current, longest, freezesLeft } = streakData.value;
  return { days, current, longest, freezesLeft };
});

const readingTime = computed<ReadingTimeStats>(() => {
  if (!readingStats.value) return EMPTY_READING_TIME;
  const { totalMinutes, sessionsCount } = readingStats.value;
  return { ...EMPTY_READING_TIME, countedMinutes: totalMinutes, sessionsCount };
});

const loadError = computed(() => {
  const failed = loadFailed.value;
  if (failed.user) return 'We could not load your profile. Refresh the page to try again.';
  if (failed.streak || failed.readingTime) {
    return 'Some of your reading stats could not be loaded. Refresh the page to try again.';
  }
  return null;
});

async function loadUser() {
  try {
    const me = await getMe();
    const [profile, mine] = await Promise.all([
      getUserProfile(me.username).catch(() => null),
      getUserReviews(me.id).catch(() => null),
    ]);
    user.value = toProfileUser(me, profile?.bio ?? null);
    reviews.value = mine;
    void loadChallengesWon(me.id);
  } catch {
    loadFailed.value.user = true;
  }
}

// A failed request leaves the count at zero.
async function loadChallengesWon(userId: string) {
  try {
    const finished = (await getUserGroups()).filter((g) => g.status === 'completed');
    const details = await Promise.all(finished.map((g) => getChallengeGroup(g.id)));
    challengesWon.value = details.filter((g) => wonChallenge(g, userId)).length;
  } catch {
    challengesWon.value = 0;
  }
}

async function loadStreak() {
  try {
    streakData.value = await getStreak();
  } catch {
    loadFailed.value.streak = true;
  }
}

async function loadReadingTime() {
  try {
    readingStats.value = await getReadingStats();
  } catch {
    loadFailed.value.readingTime = true;
  }
}

// The library and folders keep their empty states when their requests fail.
async function loadLibrary() {
  const [items, folderList] = await Promise.all([
    getUserLibrary().catch(() => []),
    getLibraryFolders().catch(() => []),
  ]);
  library.value = items;
  folderSummaries.value = folderList;
}

onMounted(() => Promise.all([loadUser(), loadStreak(), loadReadingTime(), loadLibrary()]));
</script>

<template>
  <main class="profile">
    <ProfileBookplate v-if="user" :user="user" />

    <div class="page-column">
      <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>
      <CurrentlyReading :items="currentlyReading" />

      <div class="columns">
        <div class="column">
          <BookShelf class="divided" :spines="shelf" />
          <CoverGrid :books="recentlyAdded" />
        </div>
        <div class="column">
          <ChapterLevel class="divided" :chapter="mockProfile.chapter" />
          <StreakCalendar class="divided" :streak="streak" />
          <ReadingTime class="divided" :stats="readingTime" />
          <ChallengesSummary :won="challengesWon" />
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

.load-error {
  margin: var(--space-4) 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-control);
  color: var(--color-error);
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
