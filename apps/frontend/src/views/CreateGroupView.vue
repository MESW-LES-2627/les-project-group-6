<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import GroupsPageHeader from '@/components/groups/GroupsPageHeader.vue';
import InfoNote from '@/components/groups/InfoNote.vue';
import ToggleSwitch from '@/components/groups/ToggleSwitch.vue';
import { mockFriends } from '@/mocks/groups';
import { createChallengeGroup } from '@/services/api';
import type { GroupKind, WinMetric } from '@/types/groups';
import { endDate, formatLongDate, formatPeriod } from '@/utils/groups';

// Challenges are saved through the API; book clubs and invites are not stored yet,
// so those only validate and return to /groups.
const router = useRouter();

const metrics: { id: WinMetric; label: string; winner: string }[] = [
  { id: 'minutes', label: 'Minutes', winner: 'most counted minutes' },
  { id: 'pages', label: 'Pages', winner: 'most counted pages' },
  { id: 'books', label: 'Books', winner: 'most books finished' },
  { id: 'streak', label: 'Streak', winner: 'longest daily streak' },
];
const durations = [7, 14, 30, 60];

const kind = ref<GroupKind>('challenge');
const name = ref('November Pages');
const picture = ref('');
const startDate = ref('2026-11-01');
const duration = ref(30);
const metric = ref<WinMetric>('pages');
const book = ref('');
const roundDeadline = ref('2026-11-30');
const simpleTimer = ref(true);
const stillReading = ref(false);
const inactivityPause = ref(false);
const dailyCap = ref<number | null>(60);
const endPage = ref(true);
const friendQuery = ref('');
const invited = ref<string[]>(['mayareads', 'priyapages']);
const submitted = ref(false);
const saving = ref(false);
const saveError = ref<string | null>(null);

const isChallenge = computed(() => kind.value === 'challenge');
const nameError = computed(() => submitted.value && !name.value.trim());
const metricInfo = computed(() => metrics.find((m) => m.id === metric.value)!);
const visibleFriends = computed(() => {
  const query = friendQuery.value.trim().toLowerCase().replace(/^@/, '');
  return mockFriends.filter(
    (f) => !query || f.name.toLowerCase().includes(query) || f.handle.includes(query),
  );
});
const inviteLabel = computed(() => {
  const count = invited.value.length;
  return `Create group & send ${count} ${count === 1 ? 'invite' : 'invites'}`;
});
const rulesSummary = computed(() => {
  const parts = [simpleTimer.value ? 'Timer' : 'No timer'];
  if (dailyCap.value) parts.push(`${dailyCap.value} min/day cap`);
  if (endPage.value) parts.push('end page required');
  return parts.join(' · ');
});
const checksSummary = computed(() => {
  const off = [];
  if (!stillReading.value) off.push('Still-reading checks');
  if (!inactivityPause.value) off.push('inactivity pause');
  return off.length ? `${off.join(' and ')} off` : 'Still-reading checks and inactivity pause on';
});

function toggleFriend(handle: string) {
  invited.value = invited.value.includes(handle)
    ? invited.value.filter((h) => h !== handle)
    : [...invited.value, handle];
}

function onPicture(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  picture.value = file?.name ?? '';
}

async function submit() {
  submitted.value = true;
  saveError.value = null;
  if (!name.value.trim()) return;
  if (!isChallenge.value) {
    void router.push({ name: 'groups' });
    return;
  }

  saving.value = true;
  try {
    const group = await createChallengeGroup({
      name: name.value.trim(),
      startDate: startDate.value,
      durationDays: duration.value,
      winMetric: metric.value,
    });
    void router.push({ name: 'group-detail', params: { groupId: group.id } });
  } catch (error) {
    saveError.value = (error as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="page-column create">
    <GroupsPageHeader
      eyebrow="Groups / Create a group"
      title="Start something worth reading for."
      subtitle="A friendly competition or a shared book. Bring your people and make it your own."
    >
      <template #action>
        <RouterLink class="button-outline" :to="{ name: 'groups' }">Cancel</RouterLink>
      </template>
    </GroupsPageHeader>

    <form class="layout" novalidate @submit.prevent="submit">
      <div class="steps">
        <section class="panel" aria-labelledby="scene-title">
          <h2 id="scene-title" class="panel-heading">1. Set the scene</h2>
          <div class="segmented" role="group" aria-label="Group type">
            <button
              type="button"
              :class="['segment', { selected: isChallenge }]"
              :aria-pressed="isChallenge"
              @click="kind = 'challenge'"
            >
              Challenge
            </button>
            <button
              type="button"
              :class="['segment', { selected: !isChallenge }]"
              :aria-pressed="!isChallenge"
              @click="kind = 'book-club'"
            >
              Book Club
            </button>
          </div>
          <div class="fields">
            <div class="field">
              <label for="group-name">Group name</label>
              <input
                id="group-name"
                v-model="name"
                type="text"
                :aria-invalid="nameError"
                aria-describedby="name-error"
              />
              <p v-if="nameError" id="name-error" class="error" role="alert">
                Give your group a name.
              </p>
            </div>
            <div class="field">
              <label for="group-picture">Group picture · optional</label>
              <input id="group-picture" type="file" accept="image/*" @change="onPicture" />
              <p v-if="picture" class="hint">{{ picture }}</p>
            </div>
          </div>
          <p class="hint">
            A challenge lets any book count. A book club reads one selected book per round.
          </p>
        </section>

        <section class="panel" aria-labelledby="shape-title">
          <h2 id="shape-title" class="panel-heading">
            2. Shape the {{ isChallenge ? 'challenge' : 'book club' }}
          </h2>
          <fieldset class="group" :disabled="!isChallenge">
            <div class="fields">
              <div class="field">
                <label for="start-date">Start date</label>
                <input id="start-date" v-model="startDate" type="date" />
              </div>
              <div class="field">
                <label for="duration">Duration</label>
                <select id="duration" v-model.number="duration">
                  <option v-for="days in durations" :key="days" :value="days">
                    {{ days }} days · ends
                    {{ formatLongDate(endDate(startDate, days)).slice(0, -5) }}
                  </option>
                </select>
              </div>
            </div>
            <div class="field wide">
              <label for="metric">Win metric</label>
              <select id="metric" v-model="metric">
                <option v-for="m in metrics" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
              <p class="hint">
                Choose minutes, pages, books finished, or streak. DNF never counts as a finished
                book.
              </p>
            </div>
            <div class="chips" role="group" aria-label="Win metric shortcuts">
              <button
                v-for="m in metrics"
                :key="m.id"
                type="button"
                :class="['tag', 'chip', { 'tag-highlight': metric === m.id }]"
                :aria-pressed="metric === m.id"
                @click="metric = m.id"
              >
                {{ m.label }}
              </button>
            </div>
          </fieldset>

          <fieldset class="group club-fields" :disabled="isChallenge">
            <legend>If you choose Book Club instead</legend>
            <div class="fields">
              <div class="field">
                <label for="club-book">Selected book</label>
                <input
                  id="club-book"
                  v-model="book"
                  type="text"
                  placeholder="Search title, author or ISBN…"
                />
              </div>
              <div class="field">
                <label for="round-deadline">Round deadline</label>
                <input id="round-deadline" v-model="roundDeadline" type="date" />
              </div>
            </div>
            <p class="hint">
              Only that book contributes. Every member must finish before the deadline for a
              successful round.
            </p>
          </fieldset>
        </section>

        <section class="panel" aria-labelledby="fair-title">
          <h2 id="fair-title" class="panel-heading">3. Keep it fair</h2>
          <div class="toggles">
            <ToggleSwitch
              v-model="simpleTimer"
              label="Simple timer"
              description="Default. Sessions generate time; competitive minutes can’t be typed in."
            />
            <ToggleSwitch
              v-model="stillReading"
              label="Still-reading checks"
              description="Optional periodic confirmation while the timer runs."
            />
            <ToggleSwitch
              v-model="inactivityPause"
              label="Pause for inactivity"
              description="Optional pause after an inactive interval."
            />
            <div class="cap-row">
              <div class="field">
                <label for="daily-cap">Daily counted-minute cap · optional</label>
                <input
                  id="daily-cap"
                  v-model.number="dailyCap"
                  type="number"
                  min="1"
                  max="1440"
                  placeholder="No cap"
                />
              </div>
              <ToggleSwitch
                v-model="endPage"
                label="Require an end page"
                description="Progress entry is required when saving."
              />
            </div>
          </div>
          <InfoNote class="lock" icon="lock" title="These choices lock when the competition starts">
            Duration, win metric and anti-cheat settings can’t change once reading begins. Members
            see the rules before accepting.
          </InfoNote>
        </section>

        <section class="panel" aria-labelledby="invite-title">
          <h2 id="invite-title" class="panel-heading">4. Invite your friends</h2>
          <div class="field">
            <label for="friend-search">Search accepted friends</label>
            <input
              id="friend-search"
              v-model="friendQuery"
              type="search"
              placeholder="Name or @username…"
            />
          </div>
          <ul class="friends">
            <li v-for="friend in visibleFriends" :key="friend.id">
              <button
                type="button"
                class="friend"
                :aria-pressed="invited.includes(friend.handle)"
                @click="toggleFriend(friend.handle)"
              >
                <span class="friend-avatar" aria-hidden="true">{{ friend.initials }}</span>
                <span>
                  <span class="friend-name">{{ friend.name }}</span>
                  <span class="friend-handle">
                    @{{ friend.handle }}
                    <template v-if="invited.includes(friend.handle)">
                      · Selected <span aria-hidden="true">✓</span></template
                    >
                  </span>
                </span>
              </button>
            </li>
          </ul>
          <p v-if="!visibleFriends.length" class="hint">No friends match that search.</p>
          <p class="hint">Invitations are friends-only. Readers choose whether to join.</p>
        </section>

        <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
        <div class="submit-row">
          <button type="submit" class="button" :disabled="saving">
            {{ saving ? 'Creating…' : inviteLabel }}
          </button>
          <RouterLink class="button-outline" :to="{ name: 'groups' }">Save for later</RouterLink>
        </div>
      </div>

      <aside class="side" aria-label="Preview">
        <section class="panel glance" aria-labelledby="glance-title">
          <h2 id="glance-title" class="panel-heading">Your group at a glance</h2>
          <svg
            class="flag"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path v-if="isChallenge" d="M5 21V4h11l-1.5 4L16 12H5" />
            <path v-else d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7" />
          </svg>
          <p class="glance-name">{{ name.trim() || 'Untitled group' }}</p>
          <p class="tags">
            <span class="tag tag-highlight">
              {{ isChallenge ? 'Challenge' : 'Book club' }} · Scheduled
            </span>
          </p>
          <template v-if="isChallenge">
            <p>{{ formatPeriod(startDate, duration) }}</p>
            <p>Winner: {{ metricInfo.winner }}</p>
            <p>Any book counts during the period</p>
          </template>
          <template v-else>
            <p>Round deadline: {{ formatLongDate(roundDeadline) }}</p>
            <p>{{ book.trim() ? book : 'No book selected yet' }}</p>
            <p>Only the selected book counts</p>
          </template>
          <div class="rules-summary">
            <p class="rules-title">Visible rules</p>
            <p class="small">{{ rulesSummary }}</p>
            <p class="small muted">{{ checksSummary }}</p>
            <p class="small muted">
              {{ invited.length }} friend
              {{ invited.length === 1 ? 'invitation' : 'invitations' }} · you are the admin
            </p>
          </div>
        </section>
        <InfoNote title="How profile time is counted">
          If a session qualifies for multiple groups, your profile gets the lowest counted-minute
          value across them, once. With no eligible group, full session time counts.
        </InfoNote>
        <InfoNote title="History stays separate">
          Estimated past-read minutes never count toward competitions, streaks, time badges or XP.
        </InfoNote>
      </aside>
    </form>
  </main>
</template>

<style scoped>
.create {
  padding-block: var(--space-8);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}

.steps,
.side {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.side {
  position: sticky;
  top: var(--space-4);
}

.segmented {
  display: flex;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}

.segment {
  height: 2.5rem;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.segment.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-6);
  margin-top: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.field.wide {
  margin-top: var(--space-4);
}

label {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

input:not([type='file']),
select {
  width: 100%;
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

input[type='file'] {
  padding: 0.55rem 0;
  font-size: var(--font-size-sm);
}

input[aria-invalid='true'] {
  border-color: var(--color-error);
}

input::placeholder {
  color: var(--color-text-muted);
}

.hint {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.error {
  margin: var(--space-2) 0 0;
  color: var(--color-error);
  font-size: var(--font-size-xs);
}

.group {
  margin: 0;
  padding: 0;
  border: 0;
}

.group:disabled {
  opacity: 0.55;
}

.club-fields {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.club-fields legend {
  padding: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.chips {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.chip {
  border: 0;
  cursor: pointer;
}

.toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.cap-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}

.lock {
  margin-top: var(--space-6);
}

.friends {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-6);
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.friend {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.friend:hover {
  background: var(--color-surface-hover);
}

.friend[aria-pressed='true'] {
  border-color: var(--color-border);
}

.friend-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.friend-name,
.friend-handle {
  display: block;
}

.friend-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.friend-handle {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.submit-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.glance {
  background: var(--color-surface-muted);
}

.flag {
  display: block;
  margin: var(--space-4) 0;
  color: var(--color-copper);
}

.glance-name {
  margin: 0 0 var(--space-3);
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.glance p {
  font-size: var(--font-size-sm);
}

.tags {
  margin: 0 0 var(--space-4);
}

.rules-summary {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.rules-title {
  font-weight: 600;
}

.glance .small {
  margin-bottom: var(--space-3);
  font-size: var(--font-size-xs);
}

.muted {
  color: var(--color-text-muted);
}

@media (max-width: 899px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: static;
  }
}

@media (max-width: 599px) {
  .fields,
  .cap-row,
  .friends {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
