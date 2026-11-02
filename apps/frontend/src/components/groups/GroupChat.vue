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
            width="18"
            height="18"
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
        <template v-else>
          <p v-if="message.tag" class="tag-row">
            <span class="tag">{{ message.tag }}</span>
          </p>
          <div class="author">
            <MemberAvatar :initials="message.author.initials" />
            <div>
              <p class="name">{{ message.author.name }}</p>
              <p class="time">{{ message.time }}</p>
            </div>
          </div>
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
        </template>
      </li>
    </ul>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <form class="composer" @submit.prevent="send">
      <label :for="inputId" class="composer-label">{{ label }}</label>
      <input :id="inputId" v-model="draft" type="text" :placeholder="placeholder" />
      <div class="composer-actions">
        <button type="button" class="media" aria-label="Attach an image">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="m21 16-5-5-8 9" />
          </svg>
          <span>Image</span>
        </button>
        <button type="button" class="media" aria-label="Attach a video">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="m16 10 5-3v10l-5-3" />
          </svg>
          <span>Video</span>
        </button>
        <button type="submit" class="button button-small send">Send</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.messages {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.system {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.system svg {
  flex-shrink: 0;
  color: var(--color-copper);
}

.tag-row {
  margin: 0 0 var(--space-2);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-track);
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.author {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.name,
.time,
.text {
  margin: 0;
}

.name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.time {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.text {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
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
  color: var(--color-copper);
  font-size: inherit;
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

.error {
  margin: var(--space-4) 0 0;
  color: var(--color-burgundy);
  font-size: var(--font-size-xs);
}

.composer {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.composer-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.composer input {
  width: 100%;
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.composer input::placeholder {
  color: var(--color-text-muted);
}

.composer-actions {
  display: flex;
  gap: var(--space-6);
  align-items: center;
  margin-top: var(--space-3);
}

.media {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.media:hover {
  color: var(--color-text);
}

.send {
  margin-left: auto;
}
</style>
