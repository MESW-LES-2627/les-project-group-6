<script setup lang="ts">
import { ref } from 'vue';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import type { ChatMessage, GroupMember } from '@/types/groups';

const props = defineProps<{
  messages: ChatMessage[];
  me: GroupMember;
  label: string;
  placeholder: string;
}>();

const items = ref<ChatMessage[]>([...props.messages]);
const draft = ref('');
const inputId = `chat-${props.label.replace(/\s+/g, '-').toLowerCase()}`;

function send() {
  const text = draft.value.trim();
  if (!text) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  items.value.push({ id: `local-${items.value.length}`, author: props.me, text, time });
  draft.value = '';
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
          <p class="text">{{ message.text }}</p>
        </template>
      </li>
    </ul>

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
