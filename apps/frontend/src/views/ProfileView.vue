<script setup lang="ts">
import { computed } from 'vue';
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
import StreakCalendar from '@/components/profile/StreakCalendar.vue';
import { mockNewUserProfile, mockProfile } from '@/mocks/profile';

// Mock data until the profile API exists. `/profile?state=new` shows the empty states.
const route = useRoute();
const profile = computed(() => (route.query.state === 'new' ? mockNewUserProfile : mockProfile));
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
      <MonthRecap class="top-rule" :recap="profile.recap" />
    </div>
  </main>
</template>

<style scoped>
/* The bookplate runs edge to edge, so drop the default main padding */
.profile {
  padding: 0;
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
