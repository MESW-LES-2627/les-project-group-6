<script setup lang="ts">
import { computed } from 'vue';

import type { ProfileUser } from '@/types/profile';
import { formatMonthYear } from '@/utils/date';

const props = withDefaults(
  defineProps<{
    user: ProfileUser;
    isSelf?: boolean;
  }>(),
  {
    isSelf: true,
  },
);

const privacyLabel = computed(
  () =>
    ({
      public: 'Public profile',
      friends: 'Private, friends only',
      private: 'Private, only you',
    })[props.user.privacy],
);
</script>

<template>
  <section class="band" aria-label="Profile">
    <div class="plate">
      <div class="identity">
        <div class="avatar" role="img" :aria-label="`Photo of ${user.name}`">
          {{ user.initials }}
        </div>
        <div class="details">
          <h1 class="name">{{ user.name }}</h1>
          <p class="secondary">
            @{{ user.handle }} · reading since {{ formatMonthYear(user.memberSince) }}
          </p>
          <p v-if="user.bio" class="bio">{{ user.bio }}</p>
          <p v-if="user.genres.length > 0" class="secondary genres">
            {{ user.genres.join(', ') }}
          </p>
          <a
            v-if="isSelf && !user.bio && user.genres.length === 0"
            href="#"
            class="secondary add-details"
          >
            Add a short bio and your favourite genres
          </a>
        </div>
      </div>
      <div class="actions">
        <slot name="actions">
          <a href="#" class="edit-button">Edit profile</a>
          <a href="#" class="privacy">
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
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {{ privacyLabel }}<span class="sr-only"> (privacy settings)</span>
          </a>
        </slot>
      </div>
    </div>
  </section>
</template>

<style scoped>
.band {
  padding: 14px;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.band :focus-visible {
  outline-color: var(--color-on-primary-strong);
}

.plate {
  display: flex;
  gap: var(--space-10);
  align-items: center;
  justify-content: space-between;
  max-width: 77.25rem;
  min-height: 192px;
  margin: 0 auto;
  padding: 0 34px;
  border: 1px solid rgb(255 230 167 / 25%);
}

.identity {
  display: flex;
  gap: var(--space-8);
  align-items: center;
}

.avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-avatar);
  box-shadow:
    0 0 0 3px var(--color-primary),
    0 0 0 4px rgb(255 230 167 / 45%);
  color: var(--color-on-primary);
  font-size: var(--font-size-2xl);
  font-weight: 500;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 35rem;
}

.details p {
  margin: 0;
}

.name {
  margin: 0;
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.secondary {
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
}

.details .bio {
  margin-top: 6px;
  font-size: var(--font-size-base);
}

.add-details {
  margin-top: 6px;
  text-decoration: underline;
}

.add-details:hover {
  color: var(--color-on-primary-strong);
}

.actions {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 14px;
  align-items: flex-end;
}

.edit-button {
  display: inline-flex;
  align-items: center;
  height: var(--control-height);
  padding: 0 1.25rem;
  border-radius: var(--radius-control);
  background: var(--color-bg);
  color: var(--color-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--duration-fast);
}

.edit-button:hover {
  background: var(--color-surface);
  color: var(--color-primary);
}

.privacy {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 32px;
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}

.privacy:hover {
  color: var(--color-on-primary-strong);
  text-decoration: underline;
}

@media (max-width: 899px) {
  .band {
    padding: 10px;
  }

  .plate,
  .identity {
    flex-direction: column;
    align-items: flex-start;
  }

  .plate {
    gap: var(--space-6);
    min-height: 0;
    padding: var(--space-6) 18px;
  }

  .identity {
    gap: 18px;
  }

  .name {
    font-size: var(--font-size-xl);
  }

  .actions {
    align-items: flex-start;
  }
}
</style>
