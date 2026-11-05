<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import {
  deleteGroupMessage,
  getGroupMessages,
  sendGroupMessage,
  type ApiChatMessage,
} from '@/services/api';
import { connectChatSocket, type ChatSocket } from '@/services/chat-socket';
import type { ChatMessage, GroupMember } from '@/types/groups';

const props = defineProps<{
  messages: ChatMessage[];
  me: GroupMember;
  label: string;
  placeholder: string;
  /** When set, the chat is live: history from the API and new messages over the socket. */
  groupId?: string;
  /** Live chat: who the author ids belong to. */
  members?: GroupMember[];
  /** Live chat: admins may delete anyone's message. */
  isAdmin?: boolean;
}>();

const items = ref<ChatMessage[]>(props.groupId ? [] : [...props.messages]);
const draft = ref('');
const error = ref('');
const inputId = `chat-${props.label.replace(/\s+/g, '-').toLowerCase()}`;
let lastSeq = 0;
let socket: ChatSocket | null = null;

function timeOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function authorOf(id: string): GroupMember {
  return (
    props.members?.find((m) => m.id === id) ?? {
      id,
      name: 'Former member',
      initials: '?',
      handle: '',
    }
  );
}

function toItem(message: ApiChatMessage): ChatMessage {
  return {
    id: message.id,
    seq: message.seq,
    clientId: message.clientId ?? undefined,
    author: message.authorId ? authorOf(message.authorId) : undefined,
    text: message.body ?? 'This message was deleted',
    time: timeOf(new Date(message.createdAt)),
    deleted: message.body === null,
  };
}

/** Adds or replaces a message from the server; pushes and fetches may overlap. */
function upsert(message: ApiChatMessage) {
  lastSeq = Math.max(lastSeq, message.seq);
  const item = toItem(message);
  const index = items.value.findIndex(
    (m) => m.id === message.id || (message.clientId !== null && m.clientId === message.clientId),
  );
  if (index >= 0) items.value[index] = item;
  else items.value.push(item);
  // Messages still being sent have no seq yet and stay at the bottom.
  items.value.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity));
}

function markDeleted(id: string) {
  const item = items.value.find((m) => m.id === id);
  if (item) Object.assign(item, { deleted: true, text: 'This message was deleted' });
}

/** Fetches everything after the last message we have (all of the latest page at first). */
async function catchUp() {
  if (!props.groupId) return;
  try {
    const list = await getGroupMessages(props.groupId, lastSeq ? { after: lastSeq } : {});
    list.forEach(upsert);
    error.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load messages';
  }
}

onMounted(() => {
  if (!props.groupId) return;
  void catchUp();
  socket = connectChatSocket(props.groupId, {
    onMessage: upsert,
    onDeleted: (event) => markDeleted(event.id),
    onJoined: () => void catchUp(),
  });
});

onBeforeUnmount(() => socket?.close());

async function deliver(item: ChatMessage) {
  item.pending = true;
  item.failed = false;
  try {
    upsert(await sendGroupMessage(props.groupId!, { clientId: item.clientId!, body: item.text }));
  } catch (e) {
    item.pending = false;
    item.failed = true;
    error.value = e instanceof Error ? e.message : 'Could not send the message';
  }
}

function send() {
  const text = draft.value.trim();
  if (!text) return;
  draft.value = '';

  if (!props.groupId) {
    items.value.push({
      id: `local-${items.value.length}`,
      author: props.me,
      text,
      time: timeOf(new Date()),
    });
    return;
  }

  const clientId = crypto.randomUUID();
  items.value.push({
    id: `pending-${clientId}`,
    clientId,
    author: props.me,
    text,
    time: timeOf(new Date()),
  });
  void deliver(items.value[items.value.length - 1]!);
}

function canDelete(message: ChatMessage): boolean {
  return Boolean(
    props.groupId &&
    message.author &&
    message.seq !== undefined &&
    !message.deleted &&
    (message.author.id === props.me.id || props.isAdmin),
  );
}

async function remove(message: ChatMessage) {
  try {
    await deleteGroupMessage(props.groupId!, message.id);
    markDeleted(message.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not delete the message';
  }
}
</script>

<template>
  <div class="chat">
    <ul class="messages" aria-live="polite">
      <li v-for="message in items" :key="message.id">
        <p v-if="!message.author" class="system">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 21V4h11l-1.5 4L16 12H5" />
          </svg>
          <span>System · {{ message.text }}</span>
        </p>
        <div v-else class="message">
          <MemberAvatar :initials="message.author.initials" />
          <div class="body">
            <p class="author">
              <span class="name">{{ message.author.name }}</span>
              <span class="time">{{ message.time }}</span>
              <span v-if="message.tag" class="tag">{{ message.tag }}</span>
            </p>
            <p :class="['text', { deleted: message.deleted }]">{{ message.text }}</p>
            <p v-if="message.pending || message.failed || canDelete(message)" class="status">
              <span v-if="message.pending">Sending…</span>
              <template v-if="message.failed">
                <span>Not sent.</span>
                <button type="button" class="link" @click="deliver(message)">Retry</button>
              </template>
              <button v-if="canDelete(message)" type="button" class="link" @click="remove(message)">
                Delete
              </button>
            </p>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <form class="composer" @submit.prevent="send">
      <label :for="inputId" class="sr-only">{{ label }}</label>
      <input
        :id="inputId"
        v-model="draft"
        class="field-input"
        type="text"
        :placeholder="placeholder"
      />
      <button type="submit" class="button send">Send</button>
    </form>
  </div>
</template>

<style scoped>
.messages {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.system {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.system svg {
  flex-shrink: 0;
}

.message {
  display: flex;
  gap: 14px;
}

.body {
  min-width: 0;
}

.author,
.text {
  margin: 0;
}

.author {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  align-items: baseline;
  font-size: var(--font-size-sm);
}

.name {
  font-weight: 600;
}

.time {
  color: var(--color-text-muted);
}

.tag {
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.text {
  max-width: 62ch;
  margin-top: 2px;
}

.text.deleted {
  color: var(--color-text-muted);
  font-style: italic;
}

.status {
  display: flex;
  gap: var(--space-3);
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: inherit;
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

.error {
  margin: var(--space-4) 0 0;
  color: var(--color-error);
  font-size: var(--font-size-xs);
}

.composer {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 28px;
}

.composer .field-input {
  flex: 1;
  min-width: 0;
}

.send {
  flex: none;
}
</style>
