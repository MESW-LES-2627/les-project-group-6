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

// Profile data for the signed-in reader. `/profile?state=new` shows the empty states.
const route = useRoute();
const me = ref<ApiMe | null>(null);
const streakData = ref<ApiStreak | null>(null);
const readingStats = ref<ApiReadingStats | null>(null);
const reviews = ref<ApiProfileReview[] | null>(null);

const profileUser = computed<ProfileUser>(() => {
  const base = route.query.state === 'new' ? mockNewUserProfile.user : mockProfile.user;
  if (!me.value) return base;
  const name = me.value.displayName || me.value.username || base.name;
  return {
    ...base,
    name,
    initials: initialsOf(name) || base.initials,
    handle: me.value.username || base.handle,
    memberSince: me.value.createdAt ? me.value.createdAt.slice(0, 10) : base.memberSince,
    bio: me.value.bio ?? base.bio,
    privacy:
      me.value.profileVisibility === 'public' || me.value.profileVisibility === 'friends'
        ? me.value.profileVisibility
        : 'private',
  };
});

const streak = computed<Streak>(() => {
  const base = route.query.state === 'new' ? mockNewUserProfile.streak : mockProfile.streak;
  if (streakData.value) {
    return {
      days: streakData.value.days,
      current: streakData.value.current,
      longest: streakData.value.longest,
      freezesLeft: streakData.value.freezesLeft,
    };
  }
  if (me.value && me.value.currentStreak !== undefined) {
    return {
      ...base,
      current: me.value.currentStreak,
      longest: me.value.longestStreak ?? me.value.currentStreak,
    };
  }
  return base;
});

const readingTime = computed<ReadingTimeStats>(() => {
  const base =
    route.query.state === 'new' ? mockNewUserProfile.readingTime : mockProfile.readingTime;
  if (!readingStats.value) return base;
  const { totalMinutes, sessionsCount } = readingStats.value;
  return { ...base, countedMinutes: totalMinutes, sessionsCount };
});

const profile = computed(() => {
  const base = route.query.state === 'new' ? mockNewUserProfile : mockProfile;
  return {
    ...base,
    user: profileUser.value,
    streak: streak.value,
    readingTime: readingTime.value,
  };
});

// F-LIB-02: my rated books. `null` (hidden) when the API cannot be reached or refuses.
async function loadReviews(userId: string) {
  try {
    reviews.value = await getUserReviews(userId);
  } catch {
    reviews.value = null;
  }
}

onMounted(async () => {
  try {
    const myData = await getMe();
    me.value = myData;
    void loadReviews(myData.id);
  } catch {
    // Keep mock user when API is unreachable or not authenticated
  }

  try {
    streakData.value = await getStreak();
  } catch {
    // Keep mock streak when API is unreachable
  }

  try {
    readingStats.value = await getReadingStats();
  } catch {
    // Keep mock reading time when the API is unreachable
  }
});
</script>

<template>
  <main class="profile">
    <ProfileBookplate :user="profile.user" />

    <div class="page-column">
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
