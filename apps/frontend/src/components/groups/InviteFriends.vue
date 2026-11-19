<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import { getFriends, inviteToGroup } from '@/services/api';
import type { GroupMember } from '@/types/groups';

// F-GRP-01: the admin invites friends who are not members yet. The server refuses a
// second pending invite, and that message is shown here.
const props = defineProps<{ groupId: string; members: readonly GroupMember[] }>();

const friends = ref<GroupMember[]>([]);
const invited = ref<string[]>([]);
const message = ref('');
const error = ref('');

const invitable = computed(() =>
  friends.value.filter((f) => !props.members.some((m) => m.id === f.id)),
);

onMounted(async () => {
  try {
    friends.value = await getFriends();
  } catch (e) {
    error.value = (e as Error).message;
  }
});

async function invite(friend: GroupMember) {
  error.value = '';
  try {
    await inviteToGroup(props.groupId, friend.id);
    invited.value.push(friend.id);
    message.value = `Invite sent to ${friend.name}.`;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>

<template>
  <div class="invite-friends">
    <h3 class="block-title">Invite friends</h3>
    <ul v-if="invitable.length" class="invite-list">
      <li v-for="friend in invitable" :key="friend.id">
        <MemberAvatar :initials="friend.initials" size="sm" />
        <span class="friend-name">{{ friend.name }}</span>
        <button
          type="button"
          class="button-outline button-small"
          :disabled="invited.includes(friend.id)"
          @click="invite(friend)"
        >
          {{ invited.includes(friend.id) ? 'Invited' : 'Invite' }}
        </button>
      </li>
    </ul>
    <p v-else class="lede">All your friends are already here.</p>
    <p v-if="message" class="lede" role="status">{{ message }}</p>
    <p v-if="error" class="invite-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.invite-friends {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
  min-width: 0;
}

.block-title {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.invite-list li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.friend-name {
  flex: 1;
  font-size: var(--font-size-sm);
}

.invite-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}
</style>
