<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { mockHome } from '@/mocks/home';
import { getHealth } from '../services/api';

// Mock data until the home API exists. Accepting or declining only changes this page.
const home = mockHome;
const { bedside, streak, challenge, club, goals } = home;

const friendRequest = ref(home.friendRequest);
const invitation = ref(home.invitation);
const message = ref('');

const bedsidePercent = Math.round((bedside.currentPage / bedside.pages) * 100);
const pagesToGo = bedside.pages - bedside.currentPage;
const booksToGo = goals.booksGoal - goals.booksRead;
const minutesToGo = goals.minutesGoal - goals.minutesRead;

// Circumference of the goal rings (r = 44)
const RING = 2 * Math.PI * 44;
const rings = [
  {
    value: `${goals.booksRead}/${goals.booksGoal}`,
    label: 'Books',
    ratio: goals.booksRead / goals.booksGoal,
  },
  {
    value: goals.minutesRead.toLocaleString('en-US'),
    label: `Of ${goals.minutesGoal.toLocaleString('en-US')} min`,
    ratio: goals.minutesRead / goals.minutesGoal,
  },
];

const hasRequests = computed(() => friendRequest.value || invitation.value);

function respondToFriend(accept: boolean) {
  if (!friendRequest.value) return;
  message.value = accept
    ? `You and ${friendRequest.value.name} are now friends.`
    : `You declined ${friendRequest.value.name}'s request.`;
  friendRequest.value = null;
}

function declineInvitation() {
  if (!invitation.value) return;
  message.value = `You declined ${invitation.value.title}.`;
  invitation.value = null;
}

const health = ref('Checking backend…');
const failed = ref(false);

onMounted(async () => {
  try {
    health.value = `Backend status: ${await getHealth()}`;
  } catch (error) {
    failed.value = true;
    health.value = `Backend unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
});
</script>

<template>
  <main class="page-column home">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ home.date }}</p>
        <h1>A little reading, a little wonder.</h1>
        <p class="muted">
          Good morning, {{ home.readerName }}. There's a good chapter waiting for you.
        </p>
      </div>
      <RouterLink class="button" :to="`/session/${bedside.id}`">
        <span aria-hidden="true">▷</span> Start session
      </RouterLink>
    </header>

    <div class="layout">
      <div class="main-column">
        <section class="card" aria-labelledby="bedside-title">
          <div class="card-head">
            <h2 id="bedside-title">On your bedside table</h2>
            <RouterLink class="text-link" to="/library">Your library →</RouterLink>
          </div>
          <div class="bedside">
            <img class="cover" :src="bedside.cover" alt="" width="128" height="190" />
            <div class="bedside-body">
              <span class="tag tag-highlight">In progress · {{ bedside.club }}</span>
              <h3 class="book-title">{{ bedside.title }}</h3>
              <p class="muted">{{ bedside.author }} · {{ bedside.pages }} pages</p>
              <progress
                class="progress-bar"
                :value="bedside.currentPage"
                :max="bedside.pages"
                :aria-label="`${bedside.title} progress`"
              ></progress>
              <p class="progress-meta">
                <span
                  >Page {{ bedside.currentPage }} of {{ bedside.pages }} ·
                  {{ bedsidePercent }}%</span
                >
                <span class="muted">{{ pagesToGo }} pages to go</span>
              </p>
              <div class="actions">
                <RouterLink class="button" :to="`/session/${bedside.id}`">
                  <span aria-hidden="true">▷</span> Start session
                </RouterLink>
                <RouterLink class="button-outline" :to="`/library/${bedside.id}`">
                  Book details
                </RouterLink>
              </div>
            </div>
            <div class="last-session">
              <p class="label">Your last session</p>
              <p class="big">{{ bedside.lastSession.minutes }} min</p>
              <p class="muted small">
                {{ bedside.lastSession.when }} · {{ bedside.lastSession.pages }} pages
              </p>
              <p class="accent small">Every chapter counts.</p>
            </div>
          </div>
        </section>

        <div class="pair">
          <section class="card" aria-labelledby="challenge-title">
            <div class="card-head">
              <h2 id="challenge-title">{{ challenge.name }}</h2>
              <RouterLink class="text-link" :to="`/groups/${challenge.id}`"
                >View challenge →</RouterLink
              >
            </div>
            <span class="tag tag-highlight">Challenge · Active</span>
            <div class="rank">
              <p class="big">#{{ challenge.rank }}</p>
              <div>
                <p class="strong">{{ challenge.countedMinutes }} counted min</p>
                <p class="muted small">{{ challenge.behindLeaders }} min behind the leaders</p>
              </div>
            </div>
            <progress
              class="progress-bar"
              :value="challenge.progress"
              max="100"
              aria-label="Challenge progress"
            ></progress>
            <p class="muted small">
              {{ challenge.daysLeft }} days left · Ends {{ challenge.endsOn }} ·
              {{ challenge.readers }} readers
            </p>
            <ul class="chips" aria-label="Members">
              <li v-for="member in challenge.members" :key="member" class="tag">{{ member }}</li>
              <li class="tag">+{{ challenge.readers - challenge.members.length }}</li>
            </ul>
          </section>

          <section class="card" aria-labelledby="club-title">
            <div class="card-head">
              <h2 id="club-title">{{ club.name }}</h2>
              <RouterLink class="text-link" :to="`/groups/${club.id}`">Visit club →</RouterLink>
            </div>
            <span class="tag">Book club · Active</span>
            <p class="big">{{ club.finished }} of {{ club.total }} finished</p>
            <progress
              class="progress-bar gold"
              :value="club.finished"
              :max="club.total"
              aria-label="Club members finished"
            ></progress>
            <p class="muted small">
              Your progress: {{ club.progress }}% · Deadline {{ club.deadline }}
            </p>
            <p class="small">All {{ club.total }} readers must finish before the deadline.</p>
            <ul class="chips" aria-label="Members">
              <li v-for="member in club.members" :key="member" class="tag">{{ member }}</li>
              <li class="tag">+{{ club.total - club.members.length }}</li>
            </ul>
          </section>
        </div>

        <section class="card" aria-labelledby="circle-title">
          <div class="card-head">
            <h2 id="circle-title">From your circle</h2>
            <a class="text-link" href="#">All activity →</a>
          </div>
          <ul class="activity">
            <li v-for="item in home.activity" :key="item.id">
              <span class="avatar" aria-hidden="true">{{ item.initials }}</span>
              <div>
                <p class="strong">{{ item.title }}</p>
                <p class="muted small">{{ item.detail }}</p>
              </div>
            </li>
          </ul>
          <p class="muted small">Only friends and your groups appear here.</p>
        </section>
      </div>

      <aside class="side-column" aria-label="Your reading at a glance">
        <section class="card streak" aria-labelledby="streak-title">
          <h2 id="streak-title"><span aria-hidden="true">🔥</span> Keep the glow going.</h2>
          <p class="streak-days">{{ streak.days }} day streak</p>
          <p class="small">
            {{ streak.freezesLeft }} freezes left · Stock {{ streak.freezesLeft }}/{{
              streak.freezesMax
            }}
          </p>
          <p v-if="streak.todayComplete" class="small soft">
            ✓ Today's reading day is complete. A day needs a completed session with at least 5
            counted minutes.
          </p>
        </section>

        <section class="card" aria-labelledby="goals-title">
          <div class="card-head">
            <h2 id="goals-title">Your {{ goals.year }} goals</h2>
            <a class="text-link" href="#">Edit →</a>
          </div>
          <div class="rings">
            <div v-for="ring in rings" :key="ring.label" class="ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="44" class="ring-track" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  class="ring-value"
                  :stroke-dasharray="`${ring.ratio * RING} ${RING}`"
                />
              </svg>
              <p class="ring-text">
                <span class="ring-value-text">{{ ring.value }}</span>
                <span class="ring-label">{{ ring.label }}</span>
              </p>
            </div>
          </div>
          <span v-if="goals.onSchedule" class="tag tag-highlight">On schedule</span>
          <p class="muted small goals-note">
            {{ booksToGo }} books and {{ minutesToGo.toLocaleString('en-US') }} counted minutes to
            go. Estimated time stays separate.
          </p>
        </section>

        <section class="card" aria-labelledby="now-title">
          <div class="card-head">
            <h2 id="now-title">Reading now</h2>
            <a class="text-link" href="#">Presence settings →</a>
          </div>
          <ul class="activity compact">
            <li v-for="friend in home.readingNow" :key="friend.name">
              <span class="avatar" aria-hidden="true">{{ friend.initials }}</span>
              <div>
                <p class="strong">{{ friend.name }}</p>
                <p class="muted small">{{ friend.book }} · reading now</p>
              </div>
            </li>
          </ul>
          <p class="muted small">Friends who opted in. Your presence is off.</p>
        </section>

        <section v-if="hasRequests" class="card" aria-labelledby="seat-title">
          <h2 id="seat-title">A seat saved for you</h2>
          <div v-if="friendRequest" class="request">
            <p class="strong">{{ friendRequest.name }} wants to be friends</p>
            <div class="actions">
              <button type="button" class="button button-small" @click="respondToFriend(true)">
                Accept
              </button>
              <button
                type="button"
                class="button-outline button-small"
                @click="respondToFriend(false)"
              >
                Decline
              </button>
            </div>
          </div>
          <div v-if="invitation" class="request">
            <p class="strong">Invitation · {{ invitation.title }}</p>
            <p class="muted small">{{ invitation.detail }}</p>
            <div class="actions">
              <a class="button button-small" href="#">View invite</a>
              <button type="button" class="button-outline button-small" @click="declineInvitation">
                Decline
              </button>
            </div>
          </div>
        </section>
        <p v-if="message" class="muted small" role="status">{{ message }}</p>
      </aside>
    </div>

    <div class="bottom">
      <section class="card" aria-labelledby="trending-title">
        <div class="card-head">
          <h2 id="trending-title">Trending among friends</h2>
          <a class="text-link" href="#">Explore →</a>
        </div>
        <ul class="trending">
          <li v-for="book in home.trending" :key="book.id">
            <img class="cover small-cover" :src="book.cover" alt="" width="60" height="88" />
            <div>
              <p class="strong">{{ book.title }}</p>
              <p class="muted small">{{ book.note }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="card first-chapter" aria-labelledby="first-title">
        <h2 id="first-title">Your first chapter starts here</h2>
        <p class="muted small">
          New to your shelf? Add your first book, then start a session. There's no need to set a
          goal or join a group.
        </p>
        <RouterLink class="button-outline" to="/library">+ Add a first book</RouterLink>
      </section>
    </div>

    <p class="health-status" :class="{ 'health-status--error': failed }" data-test="health">
      {{ health }}
    </p>
  </main>
</template>

<style scoped>
.home {
  padding-block: var(--space-8);
}

p {
  margin: 0;
}

.page-header {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-8);
}

.page-header h1 {
  margin: var(--space-1) 0 var(--space-2);
  font-size: var(--font-size-3xl);
}

.eyebrow,
.label {
  color: var(--color-copper);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}

.main-column,
.side-column {
  display: grid;
  gap: var(--space-6);
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
  align-items: start;
}

.card {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.card h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.card-head {
  display: flex;
  gap: var(--space-4);
  align-items: baseline;
  justify-content: space-between;
}

.text-link {
  flex-shrink: 0;
}

.tag {
  justify-self: start;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.tag-highlight {
  background: var(--color-cream);
  color: var(--color-dark-brown);
}

.muted {
  color: var(--color-text-muted);
}

.small {
  font-size: var(--font-size-sm);
}

.strong {
  font-weight: 600;
}

.accent {
  color: var(--color-primary);
}

.big {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
}

.button-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--control-height);
  padding: 0 var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.button-outline:hover {
  background: var(--color-surface-hover);
}

.button-small {
  height: 2.25rem;
  padding: 0 var(--space-4);
  font-size: var(--font-size-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.cover {
  border-radius: var(--radius-cover);
  box-shadow: var(--shadow-cover);
  object-fit: cover;
}

.bedside {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) 150px;
  gap: var(--space-6);
}

.bedside-body {
  display: grid;
  gap: var(--space-3);
  align-content: start;
}

.book-title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.last-session {
  display: grid;
  gap: var(--space-2);
  align-content: start;
}

.rank {
  display: flex;
  gap: var(--space-6);
  align-items: center;
  justify-content: space-between;
}

.gold::-webkit-progress-value {
  background: var(--color-gold);
}

.gold::-moz-progress-bar {
  background: var(--color-gold);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.activity.compact li {
  padding: var(--space-2) 0;
  border: 0;
}

.avatar {
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

.streak {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.streak h2 {
  color: var(--color-on-primary-strong);
}

.streak-days {
  font-family: var(--font-heading);
  font-size: var(--font-size-display);
  line-height: 1.1;
}

.soft {
  opacity: 0.85;
}

.rings {
  display: flex;
  gap: var(--space-6);
}

.ring {
  position: relative;
  width: 104px;
  height: 104px;
}

.ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-width: 5;
}

.ring-track {
  stroke: var(--color-track);
}

.ring-value {
  stroke: var(--color-primary);
  stroke-linecap: round;
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-value-text {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
}

.ring-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  text-transform: uppercase;
}

.request {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.request:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.bottom {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.trending {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.trending li {
  display: flex;
  gap: var(--space-3);
}

.small-cover {
  flex-shrink: 0;
  width: 60px;
  height: 88px;
}

.first-chapter {
  align-content: start;
  background: var(--color-surface-muted);
}

.first-chapter .button-outline {
  justify-self: start;
}

.health-status {
  margin-top: var(--space-8);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.health-status--error {
  color: var(--color-error);
}

@media (max-width: 1023px) {
  .layout,
  .bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 799px) {
  .page-header {
    flex-direction: column;
  }

  .page-header h1 {
    font-size: var(--font-size-xl);
  }

  .pair,
  .trending {
    grid-template-columns: minmax(0, 1fr);
  }

  .bedside {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .bedside .cover {
    width: 96px;
    height: auto;
  }

  .last-session {
    grid-column: 1 / -1;
  }
}
</style>
