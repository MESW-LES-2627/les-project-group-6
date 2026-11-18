<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

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
import { mockNewUserProfile, mockProfile } from '@/mocks/profile';
import {
  getMe,
  getReadingStats,
  getStreak,
  getUserReviews,
  type ApiMe,
  type ApiProfileReview,
  type ApiReadingStats,
  type ApiStreak,
} from '@/services/api';
import type { ProfileUser, ReadingTimeStats, Streak } from '@/types/profile';
import { initialsOf } from '@/utils/groups';

// Profile data for the signed-in reader. The user, streak and reading time come from the API
// and never fall back to mock data: a failed request shows an empty state and an error.
// The other sections are still prototypes; `/profile?state=new` shows their empty states.
const route = useRoute();
const me = ref<ApiMe | null>(null);
const streakData = ref<ApiStreak | null>(null);
const readingStats = ref<ApiReadingStats | null>(null);
const reviews = ref<ApiProfileReview[] | null>(null);
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

const profileUser = computed<ProfileUser | null>(() => {
  if (!me.value) return null;
  const name = me.value.displayName || me.value.username;
  return {
    name,
    initials: initialsOf(name),
    handle: me.value.username,
    memberSince: me.value.createdAt.slice(0, 10),
    bio: me.value.bio ?? undefined,
    genres: [],
    privacy:
      me.value.profileVisibility === 'public' || me.value.profileVisibility === 'friends'
        ? me.value.profileVisibility
        : 'private',
  };
});

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

const profile = computed(() => {
  const base = route.query.state === 'new' ? mockNewUserProfile : mockProfile;
  return { ...base, streak: streak.value, readingTime: readingTime.value };
});

const loadError = computed(() => {
  const failed = loadFailed.value;
  if (failed.user) return 'We could not load your profile. Refresh the page to try again.';
  if (failed.streak || failed.readingTime) {
    return 'Some of your reading stats could not be loaded. Refresh the page to try again.';
  }
  return null;
});

// F-LIB-02: my rated books. `null` (hidden) when the API cannot be reached or refuses.
async function loadReviews(userId: string) {
  try {
    reviews.value = await getUserReviews(userId);
  } catch {
    reviews.value = null;
  }
}

async function loadUser() {
  try {
    me.value = await getMe();
    void loadReviews(me.value.id);
  } catch {
    loadFailed.value.user = true;
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

onMounted(() => Promise.all([loadUser(), loadStreak(), loadReadingTime()]));
</script>

<template>
  <main class="profile">
    <ProfileBookplate v-if="profileUser" :user="profileUser" />

    <div class="page-column">
      <p v-if="loadError" class="load-error" role="alert">{{ loadError }}</p>
      <CurrentlyReading :items="profile.currentlyReading" />

      <div class="columns">
        <div class="column">
          <BookShelf class="divided" :spines="profile.shelf" />
          <CoverGrid :books="profile.recentlyAdded" />
        </div>
        <div class="column">
          <ChapterLevel class="divided" :chapter="profile.chapter" />
          <StreakCalendar class="divided" :streak="profile.streak" />
          <ReadingTime class="divided" :stats="profile.readingTime" />
          <ChallengesSummary :won="profile.challengesWon" />
        </div>
      </div>

      <FolderList class="top-rule" :folders="profile.folders" />
      <ReviewList v-if="reviews" class="top-rule" :reviews="reviews" />
      <MonthRecap class="top-rule" :recap="profile.recap" />
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
