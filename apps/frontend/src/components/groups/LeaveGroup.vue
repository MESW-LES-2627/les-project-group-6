<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { leaveGroup } from '@/services/api';

// F-GRP-01: a member leaves after confirming and goes back to /groups. When the server
// refuses (the admin while others remain, 409), its message is shown.
const props = defineProps<{ groupId: string; groupName: string }>();

const router = useRouter();
const busy = ref(false);
const error = ref('');

async function leave() {
  if (!window.confirm(`Leave ${props.groupName}? You can be invited again later.`)) return;
  busy.value = true;
  error.value = '';
  try {
    await leaveGroup(props.groupId);
    await router.push({ name: 'groups' });
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="leave-group">
    <button type="button" class="button-outline" :disabled="busy" @click="leave">
      Leave group
    </button>
    <p v-if="error" class="leave-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.leave-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}

.leave-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}
</style>
