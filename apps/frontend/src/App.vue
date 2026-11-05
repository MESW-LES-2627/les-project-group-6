<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { mockProfile } from '@/mocks/profile';
import { session } from '@/stores/session';
import { initialsOf } from '@/utils/groups';

const route = useRoute();
const router = useRouter();

const initials = computed(() => (session.state.me ? initialsOf(session.state.me.displayName) : ''));
// Notifications are not stored yet (F-NOTIF), so the count stays a mock.
const unreadNotifications = mockProfile.unreadNotifications;

async function signOut() {
  try {
    await session.signOut();
  } finally {
    await router.push({ name: 'login' });
  }
}
</script>

<template>
  <div class="app">
    <AppHeader
      v-if="!route.meta.hideAppChrome"
      :initials="initials"
      :unread-notifications="unreadNotifications"
      @sign-out="signOut"
    />
    <RouterView class="app-main" />
    <AppFooter v-if="!route.meta.hideAppChrome" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
}
</style>
