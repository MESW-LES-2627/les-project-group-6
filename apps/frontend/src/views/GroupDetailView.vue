<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import PageSkeleton from '@/components/layout/PageSkeleton.vue';
import {
  getBookClub,
  getChallengeGroup,
  mapApiClubToDetail,
  mapApiGroupToChallengeDetail,
} from '@/services/api';
import { session } from '@/stores/session';
import type { BookClubDetail, ChallengeDetail } from '@/types/groups';
import BookClubGroupView from '@/views/BookClubGroupView.vue';
import ChallengeGroupView from '@/views/ChallengeGroupView.vue';

const props = defineProps<{ groupId: string }>();

// The group is loaded from the API, as a challenge first and then as a book club.
const apiChallenge = ref<ChallengeDetail | null>(null);
const apiClub = ref<BookClubDetail | null>(null);
/** Bumped after each reload so the club page starts from the new data. */
const version = ref(0);
const loading = ref(true);
/** The signed-in reader (the router guard guarantees a profile). */
const meId = computed(() => session.state.me?.id ?? '');

async function loadClub() {
  apiClub.value = mapApiClubToDetail(await getBookClub(props.groupId), meId.value);
  version.value += 1;
}

onMounted(async () => {
  loading.value = true;
  try {
    apiChallenge.value = mapApiGroupToChallengeDetail(
      await getChallengeGroup(props.groupId),
      meId.value,
    );
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
  <Transition name="skeleton-swap" mode="out-in">
    <ChallengeGroupView
      v-if="apiChallenge"
      :key="apiChallenge.id"
      :challenge="apiChallenge"
      :me-id="meId"
    />
    <BookClubGroupView
      v-else-if="apiClub"
      :key="`${apiClub.id}-${version}`"
      :club="apiClub"
      :me-id="meId"
      @changed="reloadClub"
    />
    <PageSkeleton v-else-if="loading" key="loading" plate label="Loading the group…" />
    <main v-else key="missing" class="page-column missing">
      <h1>This group could not be found.</h1>
      <p>It may have been removed, or you are not a member.</p>
      <RouterLink class="button" :to="{ name: 'groups' }">Back to groups</RouterLink>
    </main>
  </Transition>
</template>

<style scoped>
.missing {
  padding-block: var(--space-12);
}
</style>
