<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { mockChallenge, mockClub } from '@/mocks/groups';
import BookClubGroupView from '@/views/BookClubGroupView.vue';
import ChallengeGroupView from '@/views/ChallengeGroupView.vue';

const props = defineProps<{ groupId: string }>();

// Only these two groups have a full page in the prototype
const challenge = computed(() => (props.groupId === mockChallenge.id ? mockChallenge : null));
const club = computed(() => (props.groupId === mockClub.id ? mockClub : null));
</script>

<template>
  <ChallengeGroupView v-if="challenge" :key="challenge.id" :challenge="challenge" />
  <BookClubGroupView v-else-if="club" :key="club.id" :club="club" />
  <main v-else class="page-column missing">
    <p class="eyebrow">Groups</p>
    <h1>This group page is not part of the prototype yet.</h1>
    <p>Open October Sprint or Classics to see the challenge and book club pages.</p>
    <RouterLink class="button" :to="{ name: 'groups' }">Back to groups</RouterLink>
  </main>
</template>

<style scoped>
.missing {
  padding-block: var(--space-12);
}
</style>
