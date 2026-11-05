<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import { mockHome } from '@/mocks/home';

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
const firstName = home.readerName;

const goalBars = [
  {
    label: `${goals.booksRead} of ${goals.booksGoal} books`,
    percent: Math.round((goals.booksRead / goals.booksGoal) * 100),
  },
  {
    label: `${goals.minutesRead.toLocaleString('en-US')} of ${goals.minutesGoal.toLocaleString('en-US')} counted minutes`,
    percent: Math.round((goals.minutesRead / goals.minutesGoal) * 100),
  },
];

const clubFinishedPercent = Math.round((club.finished / club.total) * 100);

// The last seven days, oldest first. A day is read when the streak reaches back to it.
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const today = new Date(`${home.isoDate}T12:00:00`);
const week = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(today);
  date.setDate(today.getDate() - 6 + i);
  const daysAgo = 6 - i;
  const isToday = daysAgo === 0;
  const read = streak.todayComplete ? daysAgo < streak.days : daysAgo > 0 && daysAgo <= streak.days;
  const name = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    key: date.toDateString(),
    letter: WEEKDAY_LETTERS[date.getDay()],
    day: date.getDate(),
    read,
    isToday,
    label: `${name}, ${read ? 'read' : 'no reading'}${isToday ? ', today' : ''}`,
  };
});

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
</script>

<template>
  <main class="page-column home">
    <header class="greeting">
      <h1>Good morning, {{ firstName }}.</h1>
      <p class="greeting-line">{{ home.date }}</p>
    </header>

    <section class="bedside" aria-labelledby="bedside-title">
      <RouterLink
        class="bedside-cover"
        :to="`/library/${bedside.id}`"
        tabindex="-1"
        aria-hidden="true"
      >
        <BookCoverImage :src="bedside.cover" :title="bedside.title" />
      </RouterLink>
      <div class="bedside-body">
        <h2 id="bedside-title" class="bedside-title">{{ bedside.title }}</h2>
        <p class="bedside-author">{{ bedside.author }} · reading with the {{ bedside.club }}</p>
        <div class="bedside-progress">
          <progress
            class="progress-bar"
            :value="bedside.currentPage"
            :max="bedside.pages"
            :aria-label="`${bedside.title} progress`"
          ></progress>
          <p class="progress-label">
            <span
              >Page {{ bedside.currentPage }} of {{ bedside.pages }} · {{ bedsidePercent }}%</span
            >
            <span class="muted">{{ pagesToGo }} pages to go</span>
          </p>
        </div>
        <div class="bedside-actions">
          <RouterLink class="button" :to="`/session/${bedside.id}`">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10-6.5z" />
            </svg>
            Start session
          </RouterLink>
          <RouterLink class="text-link" :to="`/library/${bedside.id}`">Book details</RouterLink>
        </div>
        <p class="last-session">
          Last session {{ bedside.lastSession.when.toLowerCase() }} ·
          {{ bedside.lastSession.minutes }} min · {{ bedside.lastSession.pages }} pages
        </p>
      </div>

      <aside class="glance" aria-label="Your week and goals">
        <section aria-labelledby="week-title">
          <div class="section-heading">
            <h2 id="week-title" class="section-title">This week</h2>
            <span class="section-meta">
              {{ streak.freezesLeft }} {{ streak.freezesLeft === 1 ? 'freeze' : 'freezes' }} left
            </span>
          </div>
          <ol class="week" aria-label="Reading days, last 7 days">
            <li v-for="day in week" :key="day.key">
              <span class="week-letter" aria-hidden="true">{{ day.letter }}</span>
              <span :class="['week-day', { read: day.read, today: day.isToday && day.read }]">
                <span aria-hidden="true">{{ day.day }}</span>
                <span class="sr-only">{{ day.label }}</span>
              </span>
            </li>
          </ol>
          <p class="streak-line">
            <strong>{{ streak.days }} days</strong> in a row
          </p>
        </section>

        <section class="goals-block" aria-labelledby="goals-title">
          <div class="section-heading">
            <h2 id="goals-title" class="section-title">Your {{ goals.year }} goals</h2>
            <a class="text-link" href="#">Edit</a>
          </div>
          <div class="goals">
            <div v-for="bar in goalBars" :key="bar.label">
              <p class="goal-label">
                <span>{{ bar.label }}</span>
                <span class="section-meta">{{ bar.percent }}%</span>
              </p>
              <progress
                class="progress-bar"
                :value="bar.percent"
                max="100"
                :aria-label="bar.label"
              ></progress>
            </div>
          </div>
          <p class="note">
            <template v-if="goals.onSchedule">On schedule · </template>{{ booksToGo }} books and
            {{ minutesToGo.toLocaleString('en-US') }} min to go.
          </p>
        </section>
      </aside>
    </section>

    <div class="columns">
      <div class="column">
        <section class="section ruled" aria-labelledby="groups-title">
          <div class="section-heading heading-gap">
            <h2 id="groups-title" class="section-title">Your groups</h2>
            <RouterLink class="text-link" to="/groups">All groups</RouterLink>
          </div>
          <ul class="group-list">
            <li>
              <RouterLink
                class="rank-tile"
                :to="`/groups/${challenge.id}`"
                tabindex="-1"
                aria-hidden="true"
              >
                #{{ challenge.rank }}<span>of {{ challenge.readers }}</span>
              </RouterLink>
              <div class="group-body">
                <div class="group-line">
                  <RouterLink class="group-name" :to="`/groups/${challenge.id}`">
                    {{ challenge.name }}
                  </RouterLink>
                  <span class="section-meta">{{ challenge.daysLeft }} days left</span>
                </div>
                <p class="group-meta">
                  Challenge · {{ challenge.countedMinutes }} counted min ·
                  {{ challenge.behindLeaders }} behind the leaders
                </p>
                <progress
                  class="progress-bar"
                  :value="challenge.progress"
                  max="100"
                  aria-label="Challenge progress"
                ></progress>
              </div>
            </li>
            <li>
              <RouterLink
                class="small-cover"
                :to="`/groups/${club.id}`"
                tabindex="-1"
                aria-hidden="true"
              >
                <BookCoverImage :src="bedside.cover" :title="bedside.title" />
              </RouterLink>
              <div class="group-body">
                <div class="group-line">
                  <RouterLink class="group-name" :to="`/groups/${club.id}`">
                    {{ club.name }}
                  </RouterLink>
                  <span class="section-meta">deadline {{ club.deadline }}</span>
                </div>
                <p class="group-meta">
                  Book club · {{ club.finished }} of {{ club.total }} finished · you’re at
                  {{ club.progress }}%
                </p>
                <progress
                  class="progress-bar gold"
                  :value="clubFinishedPercent"
                  max="100"
                  aria-label="Club members finished"
                ></progress>
              </div>
            </li>
          </ul>
        </section>

        <section class="section" aria-labelledby="circle-title">
          <div class="section-heading heading-gap">
            <h2 id="circle-title" class="section-title">From your circle</h2>
            <a class="text-link" href="#">All activity</a>
          </div>
          <ul class="activity">
            <li v-for="item in home.activity" :key="item.id">
              <MemberAvatar :initials="item.initials" />
              <div>
                <p class="activity-title">{{ item.title }}</p>
                <p class="activity-detail">{{ item.detail }}</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <aside class="column" aria-label="Your reading at a glance">
        <section :class="['section', { ruled: hasRequests }]" aria-labelledby="now-title">
          <h2 id="now-title" class="section-title heading-gap">Reading now</h2>
          <ul class="reading-now">
            <li v-for="friend in home.readingNow" :key="friend.name">
              <MemberAvatar :initials="friend.initials" size="sm" />
              <span>
                {{ friend.name }}
                <span class="muted"
                  >· <cite>{{ friend.book }}</cite></span
                >
              </span>
            </li>
          </ul>
        </section>

        <section v-if="hasRequests" class="section" aria-labelledby="waiting-title">
          <h2 id="waiting-title" class="section-title heading-gap">Waiting for you</h2>
          <div class="requests">
            <div v-if="friendRequest">
              <p class="request-line">
                <strong>{{ friendRequest.name }}</strong> wants to be friends
              </p>
              <div class="request-actions">
                <button type="button" class="button button-small" @click="respondToFriend(true)">
                  Accept
                </button>
                <button type="button" class="button-outline" @click="respondToFriend(false)">
                  Decline
                </button>
              </div>
            </div>
            <div v-if="invitation">
              <p class="request-line">
                <strong>{{ invitation.title }}</strong> · {{ invitation.detail }}
              </p>
              <div class="request-actions">
                <RouterLink class="button button-small" to="/groups">View invite</RouterLink>
                <button type="button" class="button-outline" @click="declineInvitation">
                  Decline
                </button>
              </div>
            </div>
          </div>
        </section>
        <p v-if="message" class="note status" role="status">{{ message }}</p>
      </aside>
    </div>

    <section class="section trending-section" aria-labelledby="trending-title">
      <div class="section-heading heading-gap">
        <h2 id="trending-title" class="section-title">Trending among friends</h2>
        <a class="text-link" href="#">Explore</a>
      </div>
      <ul class="trending">
        <li v-for="book in home.trending" :key="book.id">
          <div class="trending-cover">
            <BookCoverImage :src="book.cover" :title="book.title" />
          </div>
          <div>
            <p class="trending-title">{{ book.title }}</p>
            <p class="note">{{ book.note }}</p>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.home {
  /* The app shell is a flex column; without a width the centred column shrinks to its content */
  width: 100%;
  padding-block: var(--space-12) 0;
}

.greeting h1 {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  letter-spacing: -0.015em;
}

.greeting-line {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
}

/* The book on the bedside table, with this week and the year's goals beside it */
.bedside {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) minmax(0, 22rem);
  gap: var(--space-10);
  align-items: center;
  margin-top: var(--space-10);
  padding-bottom: var(--space-10);
  border-bottom: 1px solid var(--color-border);
}

.bedside-cover {
  display: block;
}

.bedside-body {
  min-width: 0;
}

.glance {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  align-self: stretch;
  justify-content: center;
  padding-left: var(--space-10);
  border-left: 1px solid var(--color-border);
}

.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
  text-align: center;
}

.week li {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.week-letter {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.week-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.week-day.read {
  background: var(--color-streak-read);
  color: var(--color-primary);
  font-weight: 600;
}

.week-day.today {
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.streak-line {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.streak-line strong {
  color: var(--color-text);
  font-weight: 600;
}

.goals-block .goals {
  margin-top: var(--space-4);
}

.bedside-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.bedside-author {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-md);
}

.bedside-progress {
  margin-top: var(--space-6);
}

.progress-label {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  justify-content: space-between;
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-sm);
}

.bedside-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-6);
  align-items: center;
  margin-top: var(--space-6);
}

.bedside-actions .text-link {
  font-size: var(--font-size-base);
}

.last-session {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  column-gap: 64px;
}

.column {
  min-width: 0;
}

.section {
  padding: var(--space-10) 0 34px;
}

.ruled {
  border-bottom: 1px solid var(--color-border);
}

.heading-gap {
  margin-bottom: 22px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.group-list li {
  display: flex;
  gap: 20px;
  align-items: center;
}

.rank-tile {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64px;
  aspect-ratio: 2 / 3;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface-muted);
  color: var(--color-primary);
  font-size: 1.375rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
}

.rank-tile span {
  margin-top: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-2xs);
  font-weight: 400;
}

.small-cover {
  display: block;
  flex: none;
  width: 64px;
}

.group-body {
  flex: 1;
  min-width: 0;
}

.group-line {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-3);
  align-items: baseline;
  justify-content: space-between;
}

.group-name {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

.group-name:hover {
  color: var(--color-primary);
}

.group-meta {
  margin: 2px 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.gold {
  color: var(--color-gold);
}

.gold::-webkit-progress-value {
  background: var(--color-gold);
}

.gold::-moz-progress-bar {
  background: var(--color-gold);
}

.activity {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity li {
  display: flex;
  gap: 14px;
}

.activity-title,
.activity-detail {
  margin: 0;
}

.activity-title {
  font-weight: 500;
}

.activity-detail {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.note {
  margin: var(--space-4) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.goals {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.goal-label {
  display: flex;
  justify-content: space-between;
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
}

.reading-now {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.reading-now li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

cite {
  font-family: var(--font-heading);
  font-style: italic;
}

.requests {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.request-line {
  margin: 0;
}

.request-line strong {
  font-weight: 600;
}

.request-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.status {
  margin-bottom: var(--space-6);
}

.trending-section {
  padding-bottom: 56px;
  border-top: 1px solid var(--color-border);
}

.trending {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-6) var(--space-10);
  margin: 0;
  padding: 0;
  list-style: none;
}

.trending li {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.trending-cover {
  flex: none;
  width: 56px;
}

.trending-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 600;
}

.trending .note {
  margin-top: 2px;
}

@media (max-width: 899px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
  }

  .column:first-child .section:last-child {
    border-bottom: 1px solid var(--color-border);
  }

  .bedside {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
  }

  .bedside-cover {
    width: 140px;
  }

  .glance {
    padding-top: var(--space-6);
    padding-left: 0;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}
</style>
