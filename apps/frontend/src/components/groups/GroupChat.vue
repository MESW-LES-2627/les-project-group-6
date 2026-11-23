<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

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

// The messages scroll inside the chat. New messages stay in view while the reader is at
// the bottom; if they scrolled up to read older ones, their position stays put and a
// button offers the jump back to the newest message.
const messagesEl = ref<HTMLElement | null>(null);
const atBottom = ref(true);
const hasNew = ref(false);
const BOTTOM_THRESHOLD = 24;

function nearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
}

function scrollToNewest() {
  const el = messagesEl.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  atBottom.value = true;
  hasNew.value = false;
}

function onScroll() {
  const el = messagesEl.value;
  if (!el) return;
  atBottom.value = nearBottom(el);
  if (atBottom.value) hasNew.value = false;
}

/** Scrolls after the DOM updates, but leaves a reader who scrolled up where they are. */
async function settleScroll(stick: boolean) {
  await nextTick();
  if (stick || atBottom.value) scrollToNewest();
  else hasNew.value = true;
}

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
function upsert(message: ApiChatMessage, stick = false) {
  lastSeq = Math.max(lastSeq, message.seq);
  const item = toItem(message);
  const index = items.value.findIndex(
    (m) => m.id === message.id || (message.clientId !== null && m.clientId === message.clientId),
  );
  if (index >= 0) items.value[index] = item;
  else items.value.push(item);
  // Messages still being sent have no seq yet and stay at the bottom.
  items.value.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity));
  void settleScroll(stick);
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
    for (const message of list) upsert(message);
    error.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load messages';
  }
}

onMounted(() => {
  void settleScroll(true);
  if (!props.groupId) return;
  void catchUp();
  socket = connectChatSocket(props.groupId, {
    onMessage: (message) => upsert(message),
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
    void settleScroll(true);
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
  void settleScroll(true);
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
    <div class="messages-wrap">
      <ul
        ref="messagesEl"
        class="messages"
        aria-live="polite"
        aria-label="Conversation"
        tabindex="0"
        @scroll.passive="onScroll"
      >
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
                <button
                  v-if="canDelete(message)"
                  type="button"
                  class="link"
                  @click="remove(message)"
                >
                  Delete
                </button>
              </p>
            </div>
          </div>
        </li>
      </ul>

      <button v-if="hasNew" type="button" class="new-messages" @click="scrollToNewest">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        New messages
      </button>
    </div>

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
.messages-wrap {
  position: relative;
}

/* The conversation scrolls inside the chat instead of stretching the page. */
.messages {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-height: min(50vh, 38rem);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  scrollbar-gutter: stable;
}

.messages:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.new-messages {
  position: absolute;
  bottom: var(--space-3);
  left: 50%;
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  box-shadow: var(--shadow-menu);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transform: translateX(-50%);
}

.new-messages:hover {
  background: var(--color-surface-hover);
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
