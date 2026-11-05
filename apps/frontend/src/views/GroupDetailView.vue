<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { mockChallenge, mockClub } from '@/mocks/groups';
import {
  DEMO_USER_ID,
  getBookClub,
  getChallengeGroup,
  mapApiClubToDetail,
  mapApiGroupToChallengeDetail,
} from '@/services/api';
import type { BookClubDetail, ChallengeDetail } from '@/types/groups';
import BookClubGroupView from '@/views/BookClubGroupView.vue';
import ChallengeGroupView from '@/views/ChallengeGroupView.vue';

const props = defineProps<{ groupId: string }>();

// The two mock groups keep the design data; any other id is loaded from the API,
// as a challenge first and then as a book club.
const apiChallenge = ref<ChallengeDetail | null>(null);
const apiClub = ref<BookClubDetail | null>(null);
/** Bumped after each reload so the club page starts from the new data. */
const version = ref(0);
const loading = ref(false);
const challenge = computed(() =>
  props.groupId === mockChallenge.id ? mockChallenge : apiChallenge.value,
);
const club = computed(() => (props.groupId === mockClub.id ? mockClub : apiClub.value));
const isMock = computed(() => props.groupId === mockChallenge.id || props.groupId === mockClub.id);

async function loadClub() {
  apiClub.value = mapApiClubToDetail(await getBookClub(props.groupId, DEMO_USER_ID), DEMO_USER_ID);
  version.value += 1;
}

onMounted(async () => {
  if (isMock.value) return;
  loading.value = true;
  try {
    apiChallenge.value = mapApiGroupToChallengeDetail(await getChallengeGroup(props.groupId));
  } catch {
    try {
      await loadClub();
    } catch {
      // Unknown group: show the missing page
    }
  } finally {
    loading.value = false;
  }
});

async function reloadClub() {
  try {
    await loadClub();
  } catch {
    // Keep the page as it is; the action already showed its error
  }
}
</script>

<template>
  <ChallengeGroupView
    v-if="challenge"
    :key="challenge.id"
    :challenge="challenge"
    :me-id="isMock ? undefined : DEMO_USER_ID"
    :live="!isMock"
  />
  <BookClubGroupView
    v-else-if="club"
    :key="`${club.id}-${version}`"
    :club="club"
    :me-id="isMock ? undefined : DEMO_USER_ID"
    :live="!isMock"
    @changed="reloadClub"
  />
  <main v-else-if="loading" class="page-column missing" aria-busy="true"></main>
  <main v-else class="page-column missing">
    <h1>This group could not be found.</h1>
    <p>Open October Sprint or Classics to see the challenge and book club pages.</p>
    <RouterLink class="button" :to="{ name: 'groups' }">Back to groups</RouterLink>
  </main>
</template>

<style scoped>
.missing {
  padding-block: var(--space-12);
}
</style>
