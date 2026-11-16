<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import ProfileBookplate from '@/components/profile/ProfileBookplate.vue';
import ReadingTime from '@/components/profile/ReadingTime.vue';
import ReviewList from '@/components/profile/ReviewList.vue';
import StreakCalendar from '@/components/profile/StreakCalendar.vue';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getUserProfile,
  getUserReviews,
  removeFriend,
  sendFriendRequest,
  type ApiProfileReview,
  type ApiUserProfile,
} from '@/services/api';
import type { ProfileUser, ReadingTimeStats, Streak, StreakDay } from '@/types/profile';

const props = defineProps<{ username: string }>();
const router = useRouter();

const profile = ref<ApiUserProfile | null>(null);
const reviews = ref<ApiProfileReview[] | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const isNotFound = ref(false);

const actionLoading = ref(false);
const actionError = ref<string | null>(null);

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const initials = computed(() => {
  const name = profile.value?.displayName || profile.value?.username || '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'U';
});

const profileUser = computed<ProfileUser | null>(() => {
  if (!profile.value) return null;
  return {
    name: profile.value.displayName,
    initials: initials.value,
    handle: profile.value.username,
    memberSince: profile.value.createdAt.slice(0, 10),
    bio: profile.value.bio || undefined,
    genres: [],
    privacy: profile.value.profileVisibility === 'public' ? 'public' : 'private',
  };
});

const readingTimeStats = computed<ReadingTimeStats>(() => ({
  countedMinutes: profile.value?.totalMinutes ?? 0,
  sessionsCount: profile.value?.sessionsCount ?? 0,
  importedHours: 0,
}));

const streak = computed<Streak>(() => {
  const current = profile.value?.currentStreak ?? 0;
  const longest = profile.value?.longestStreak ?? 0;
  const today = new Date();
  const days: StreakDay[] = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27 + i);
    const iso = toIsoDate(d);
    const isRead = i >= 28 - current;
    return { date: iso, read: isRead };
  });
  return {
    days,
    current,
    longest,
    freezesLeft: 0,
  };
});

async function loadProfile() {
  isLoading.value = true;
  errorMessage.value = null;
  isNotFound.value = false;
  reviews.value = null;

  try {
    const data = await getUserProfile(props.username);
    if (data.isSelf) {
      void router.replace({ name: 'profile' });
      return;
    }
    profile.value = data;

    if (data.isVisible) {
      try {
        reviews.value = await getUserReviews(data.id);
      } catch {
        reviews.value = [];
      }
    }
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      (err as { status: number }).status === 404
    ) {
      isNotFound.value = true;
    } else {
      errorMessage.value = err instanceof Error ? err.message : 'Failed to load user profile';
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleAddFriend() {
  if (!profile.value) return;
  actionLoading.value = true;
  actionError.value = null;
  try {
    const friendship = await sendFriendRequest(profile.value.id);
    profile.value.friendshipStatus = 'pending_sent';
    profile.value.friendRequestId = friendship.id;
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Failed to send friend request';
  } finally {
    actionLoading.value = false;
  }
}

async function handleAcceptFriend() {
  if (!profile.value?.friendRequestId) return;
  actionLoading.value = true;
  actionError.value = null;
  try {
    await acceptFriendRequest(profile.value.friendRequestId);
    profile.value.friendshipStatus = 'friends';
    profile.value.isVisible = true;
    try {
      reviews.value = await getUserReviews(profile.value.id);
    } catch {
      reviews.value = [];
    }
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Failed to accept friend request';
  } finally {
    actionLoading.value = false;
  }
}

async function handleDeclineFriend() {
  if (!profile.value?.friendRequestId) return;
  actionLoading.value = true;
  actionError.value = null;
  try {
    await declineFriendRequest(profile.value.friendRequestId);
    profile.value.friendshipStatus = 'none';
    profile.value.friendRequestId = null;
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Failed to decline friend request';
  } finally {
    actionLoading.value = false;
  }
}

async function handleRemoveFriend() {
  if (!profile.value) return;
  actionLoading.value = true;
  actionError.value = null;
  try {
    await removeFriend(profile.value.id);
    profile.value.friendshipStatus = 'none';
    profile.value.friendRequestId = null;
    profile.value.isVisible = profile.value.profileVisibility === 'public';
    if (!profile.value.isVisible) {
      reviews.value = null;
    }
  } catch (err: unknown) {
    actionError.value = err instanceof Error ? err.message : 'Failed to remove friend';
  } finally {
    actionLoading.value = false;
  }
}

watch(
  () => props.username,
  () => void loadProfile(),
);
onMounted(() => void loadProfile());
</script>

<template>
  <main class="user-profile">
    <div v-if="isLoading" class="state-container loading-state">
      <p class="muted">Loading profile...</p>
    </div>

    <div v-else-if="isNotFound" class="state-container not-found-state">
      <h1 class="state-title">User not found</h1>
      <p class="muted">We couldn't find a reader with username @{{ username }}.</p>
      <RouterLink to="/explore" class="back-link">Search other readers and books</RouterLink>
    </div>

    <div v-else-if="errorMessage" class="state-container error-state">
      <h1 class="state-title">Unable to load profile</h1>
      <p class="error-text">{{ errorMessage }}</p>
      <button class="retry-button" @click="loadProfile">Try again</button>
    </div>

    <template v-else-if="profile && profileUser">
      <ProfileBookplate :user="profileUser" :is-self="false">
        <template #actions>
          <div class="friend-actions">
            <p v-if="actionError" class="action-error">{{ actionError }}</p>

            <button
              v-if="profile.friendshipStatus === 'none'"
              class="action-button primary"
              :disabled="actionLoading"
              @click="handleAddFriend"
            >
              Add friend
            </button>

            <span
              v-else-if="profile.friendshipStatus === 'pending_sent'"
              class="status-badge pending"
            >
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Friend request sent
            </span>

            <div v-else-if="profile.friendshipStatus === 'pending_received'" class="button-group">
              <button
                class="action-button primary"
                :disabled="actionLoading"
                @click="handleAcceptFriend"
              >
                Accept request
              </button>
              <button
                class="action-button secondary"
                :disabled="actionLoading"
                @click="handleDeclineFriend"
              >
                Decline
              </button>
            </div>

            <div v-else-if="profile.friendshipStatus === 'friends'" class="friends-status">
              <span class="status-badge confirmed">
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
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Friends
              </span>
              <button
                class="remove-friend-button"
                :disabled="actionLoading"
                title="Remove friend"
                @click="handleRemoveFriend"
              >
                Remove
              </button>
            </div>
          </div>
        </template>
      </ProfileBookplate>

      <div v-if="!profile.isVisible" class="page-column">
        <div class="private-card" role="region" aria-label="Private Profile">
          <div class="private-icon" aria-hidden="true">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 class="private-title">This profile is private</h2>
          <p class="private-message">
            <template v-if="profile.friendshipStatus === 'none'">
              Send a friend request to @{{ profile.username }} to see their reading streak, reading
              time, and reviews.
            </template>
            <template v-else-if="profile.friendshipStatus === 'pending_sent'">
              Your friend request is pending. When @{{ profile.username }} accepts it, you'll be
              able to see their reading activity.
            </template>
            <template v-else>
              Only mutual friends can view this reader's reading activity and reviews.
            </template>
          </p>
        </div>
      </div>

      <div v-else class="page-column">
        <div class="columns">
          <div class="column">
            <StreakCalendar class="divided" :streak="streak" />
            <ReadingTime class="divided" :stats="readingTimeStats" />
          </div>
        </div>

        <ReviewList v-if="reviews && reviews.length > 0" class="top-rule" :reviews="reviews" />
        <div v-else-if="reviews && reviews.length === 0" class="empty-reviews top-rule">
          <h2 class="empty-title">Reviews</h2>
          <p class="muted">No reviews yet.</p>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.user-profile {
  padding: 0;
}

.user-profile :deep(:is(h1, h2)) {
  font-family: var(--font-body);
}

.state-container {
  max-width: 36rem;
  margin: var(--space-12) auto;
  padding: var(--space-8);
  text-align: center;
}

.state-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.error-text {
  color: var(--color-error);
  margin-bottom: var(--space-4);
}

.back-link,
.retry-button {
  display: inline-block;
  margin-top: var(--space-4);
  padding: 8px 16px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.friend-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.action-error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: #ffcccc;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--control-height, 36px);
  padding: 0 1.25rem;
  border-radius: var(--radius-control, 6px);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity var(--duration-fast, 150ms);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button.primary {
  background: var(--color-bg);
  color: var(--color-primary);
}

.action-button.primary:hover:not(:disabled) {
  background: var(--color-surface);
}

.action-button.secondary {
  background: transparent;
  color: var(--color-on-primary);
  border: 1px solid rgb(255 230 167 / 40%);
}

.action-button.secondary:hover:not(:disabled) {
  background: rgb(255 230 167 / 15%);
}

.button-group,
.friends-status {
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: var(--radius-control, 6px);
  background: rgb(255 230 167 / 15%);
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.remove-friend-button {
  background: transparent;
  color: rgb(255 230 167 / 70%);
  border: none;
  font-size: var(--font-size-xs);
  cursor: pointer;
  text-decoration: underline;
  padding: 4px 6px;
}

.remove-friend-button:hover:not(:disabled) {
  color: var(--color-on-primary);
}

.private-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: var(--space-12) auto;
  max-width: 32rem;
  padding: var(--space-12) var(--space-6);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.private-icon {
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}

.private-title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

.private-message {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  line-height: var(--line-height-body);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: 64px;
  border-top: 1px solid var(--color-border);
}

.column {
  min-width: 0;
}

.divided {
  border-bottom: 1px solid var(--color-border);
}

.top-rule {
  border-top: 1px solid var(--color-border);
}

.empty-reviews {
  padding: 32px 0;
}

.empty-title {
  margin: 0 0 18px;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 899px) {
  .friend-actions {
    align-items: flex-start;
  }
}
</style>
