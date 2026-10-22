<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';

import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { mockProfile } from '@/mocks/profile';

// The signed-in user comes from the mock until auth (Supabase) is wired in
const currentUser = mockProfile;
const route = useRoute();
</script>

<template>
  <div class="app">
    <AppHeader
      v-if="!route.meta.hideAppChrome"
      :initials="currentUser.user.initials"
      :unread-notifications="currentUser.unreadNotifications"
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
