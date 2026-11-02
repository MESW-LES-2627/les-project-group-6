<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { mockChallenge, mockClub } from '@/mocks/groups';
import { DEMO_USER_ID, getChallengeGroup, mapApiGroupToChallengeDetail } from '@/services/api';
import type { ChallengeDetail } from '@/types/groups';
import BookClubGroupView from '@/views/BookClubGroupView.vue';
import ChallengeGroupView from '@/views/ChallengeGroupView.vue';

const props = defineProps<{ groupId: string }>();

// The two mock groups keep the design data; any other id is loaded from the API.
const apiChallenge = ref<ChallengeDetail | null>(null);
const loading = ref(false);
const challenge = computed(() =>
  props.groupId === mockChallenge.id ? mockChallenge : apiChallenge.value,
);
const club = computed(() => (props.groupId === mockClub.id ? mockClub : null));
const meId = computed(() => (apiChallenge.value ? DEMO_USER_ID : undefined));

onMounted(async () => {
  if (props.groupId === mockChallenge.id || props.groupId === mockClub.id) return;
  loading.value = true;
  try {
    apiChallenge.value = mapApiGroupToChallengeDetail(await getChallengeGroup(props.groupId));
  } catch {
    // Unknown group: show the missing page
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <ChallengeGroupView v-if="challenge" :key="challenge.id" :challenge="challenge" :me-id="meId" />
  <BookClubGroupView v-else-if="club" :key="club.id" :club="club" />
  <main v-else-if="loading" class="page-column missing" aria-busy="true">
    <p class="eyebrow">Groups</p>
  </main>
  <main v-else class="page-column missing">
    <p class="eyebrow">Groups</p>
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
