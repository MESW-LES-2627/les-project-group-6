<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import { mockHome } from '@/mocks/home';
import {
  answerFriendRequest,
  answerInvite,
  getActiveReadingSession,
  getChallengeGroup,
  getCircleComments,
  getFriendRequests,
  getFriendsReading,
  getPendingInvites,
  getUserBookClubs,
  getUserGroups,
  getUserLibrary,
  mapApiClubToSummary,
  mapApiGroupToChallengeDetail,
  mapApiGroupToSummary,
  mapApiLibraryItemToBook,
  type ApiCircleComment,
  type ApiPendingInvite,
  type ApiReadingSession,
} from '@/services/api';
import { currentUserId, isSignedIn, session } from '@/stores/session';
import type {
  ActivityItem,
  HomeChallenge,
  HomeClub,
  HomeFriendReading,
  HomeFriendRequest,
  HomeGroupInvite,
  HomeReadingBook,
} from '@/types/home';
import type { LibraryBook } from '@/types/library';
import { formatLongDate, initialsOf } from '@/utils/groups';

// The API has no Home endpoint yet: reading, groups, invites and the circle
// sections are real, while the streak and goals stay from the prototype.
const home = mockHome;
const { streak, goals } = home;

const firstName = session.state.me?.displayName.trim().split(' ')[0] || home.readerName;

const today = new Date();
today.setHours(12, 0, 0, 0);
const greetingDate = today.toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const booksToGo = goals.booksGoal - goals.booksRead;
const minutesToGo = goals.minutesGoal - goals.minutesRead;

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

// The last seven days, oldest first. A day is read when the streak reaches back to it.
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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

const hero = ref<HomeReadingBook | null>(isSignedIn.value ? null : mockReadingHero());
const alsoReading = ref<HomeReadingBook[]>([]);
const hasBooks = ref(!isSignedIn.value);
const activeSession = ref<ApiReadingSession | null>(null);
const loadingReading = ref(isSignedIn.value);
const readingError = ref<string | null>(null);

const challenges = ref<HomeChallenge[]>(isSignedIn.value ? [] : mockChallenges());
const clubs = ref<HomeClub[]>(isSignedIn.value ? [] : mockClubs());
const loadingGroups = ref(isSignedIn.value);
const groupsError = ref<string | null>(null);

const friendRequests = ref<HomeFriendRequest[]>(
  isSignedIn.value || !home.friendRequest
    ? []
    : [{ id: 'mock-friend', name: home.friendRequest.name }],
);
const invites = ref<HomeGroupInvite[]>(
  isSignedIn.value || !home.invitation ? [] : [{ ...home.invitation }],
);
const loadingInvites = ref(isSignedIn.value);
const invitesError = ref<string | null>(null);
const invitesMessage = ref('');
const answering = ref<string | null>(null);

const friendsReading = ref<HomeFriendReading[]>(
  isSignedIn.value
    ? []
    : home.readingNow.map((friend) => ({
        id: friend.name,
        initials: friend.initials,
        name: friend.name,
        book: friend.book,
        readingNow: true,
      })),
);
const loadingReadingNow = ref(isSignedIn.value);
const readingNowError = ref<string | null>(null);

const circleComments = ref<ActivityItem[]>(isSignedIn.value ? [] : home.activity);
const loadingCircle = ref(isSignedIn.value);
const circleError = ref<string | null>(null);

const isResuming = computed(
  () => activeSession.value !== null && activeSession.value.bookId === hero.value?.id,
);
const hasGroups = computed(() => challenges.value.length > 0 || clubs.value.length > 0);
const hasInvites = computed(() => friendRequests.value.length > 0 || invites.value.length > 0);

function mockReadingHero(): HomeReadingBook {
  const bedside = home.bedside;
  return {
    id: bedside.id,
    title: bedside.title,
    author: bedside.author,
    cover: bedside.cover,
    pages: bedside.pages,
    currentPage: bedside.currentPage,
    percent: Math.round((bedside.currentPage / bedside.pages) * 100),
    pagesToGo: bedside.pages - bedside.currentPage,
    club: bedside.club,
    lastSession: `Last session ${bedside.lastSession.when.toLowerCase()} · ${bedside.lastSession.minutes} min · ${bedside.lastSession.pages} pages`,
  };
}

function mockChallenges(): HomeChallenge[] {
  const challenge = home.challenge;
  return [
    {
      id: challenge.id,
      name: challenge.name,
      rank: challenge.rank,
      readers: challenge.readers,
      score: `${challenge.countedMinutes} counted min · ${challenge.behindLeaders} behind the leaders`,
      daysLeft: `${challenge.daysLeft} days left`,
      progress: challenge.progress,
    },
  ];
}

function mockClubs(): HomeClub[] {
  const club = home.club;
  return [
    {
      id: club.id,
      name: club.name,
      bookTitle: home.bedside.title,
      bookCover: home.bedside.cover,
      finished: club.finished,
      total: club.total,
      progress: club.progress,
      deadline: club.deadline,
    },
  ];
}

function toReadingBook(book: LibraryBook): HomeReadingBook {
  const pages = book.pages || 1;
  const currentPage = Math.min(book.currentPage || 0, pages);
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    pages,
    currentPage,
    percent: Math.round((currentPage / pages) * 100),
    pagesToGo: pages - currentPage,
  };
}

function toGroupInvite(invite: ApiPendingInvite): HomeGroupInvite {
  const kind = invite.groupKind === 'challenge' ? 'Challenge' : 'Book club';
  return {
    id: invite.id,
    title: invite.groupName,
    detail: `${kind} · invited by ${invite.inviterName}`,
  };
}

/** "just now", "5 min ago", "2 hours ago", "3 days ago", then the date. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatLongDate(iso.slice(0, 10));
}

function toCircleComment(comment: ApiCircleComment): ActivityItem {
  return {
    id: comment.id,
    initials: initialsOf(comment.authorName),
    title: `${comment.authorName} · ${comment.groupName}`,
    detail: `“${comment.body}” · ${timeAgo(comment.createdAt)}`,
    to: `/groups/${comment.groupId}`,
  };
}

async function loadReading() {
  if (!isSignedIn.value) return;

  loadingReading.value = true;
  readingError.value = null;

  try {
    const [library, active] = await Promise.allSettled([
      getUserLibrary(),
      getActiveReadingSession(),
    ]);
    if (library.status === 'rejected') throw library.reason;
    activeSession.value = active.status === 'fulfilled' ? active.value : null;

    const books = library.value.map(mapApiLibraryItemToBook);
    hasBooks.value = books.length > 0;

    const inProgress = books
      .filter((book) => book.status === 'in-progress')
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const activeBook = activeSession.value
      ? books.find((book) => book.id === activeSession.value?.bookId)
      : undefined;
    const ordered = activeBook
      ? [activeBook, ...inProgress.filter((book) => book.id !== activeBook.id)]
      : inProgress;

    const [first, ...rest] = ordered;
    hero.value = first ? toReadingBook(first) : null;
    alsoReading.value = rest.map(toReadingBook);
  } catch {
    hero.value = null;
    alsoReading.value = [];
    readingError.value = 'We could not load your reading. Please refresh the page.';
  } finally {
    loadingReading.value = false;
  }
}

async function loadGroups() {
  if (!isSignedIn.value) return;

  loadingGroups.value = true;
  groupsError.value = null;

  try {
    const [groupList, clubList] = await Promise.all([getUserGroups(), getUserBookClubs()]);
    const active = groupList.filter((group) => group.status === 'active');
    const details = await Promise.allSettled(active.map((group) => getChallengeGroup(group.id)));
    const meId = currentUserId();

    challenges.value = active.map((group, i) => {
      const summary = mapApiGroupToSummary(group);
      const detail = details[i];
      const mine =
        detail?.status === 'fulfilled'
          ? mapApiGroupToChallengeDetail(detail.value, meId).leaderboard.find(
              (entry) => entry.member.id === meId,
            )
          : undefined;
      return {
        id: group.id,
        name: group.name,
        rank: mine?.rank ?? null,
        readers: group.members.length,
        score: mine?.score ?? null,
        daysLeft: summary.detail,
        progress: summary.progress,
      };
    });

    clubs.value = clubList
      .filter((club) => club.round.outcome === 'active')
      .map((club) => {
        const summary = mapApiClubToSummary(club);
        return {
          id: club.id,
          name: club.name,
          bookTitle: club.round.book?.title ?? 'the club book',
          bookCover: club.round.book?.coverUrl ?? '',
          finished: club.round.finished,
          total: club.round.expected || club.members.length,
          progress: summary.progress,
          deadline: formatLongDate(club.round.deadline),
        };
      });
  } catch {
    challenges.value = [];
    clubs.value = [];
    groupsError.value = 'We could not load your groups. Please refresh the page.';
  } finally {
    loadingGroups.value = false;
  }
}

async function loadInvites() {
  if (!isSignedIn.value) return;

  loadingInvites.value = true;
  invitesError.value = null;

  try {
    const [requests, pending] = await Promise.all([getFriendRequests(), getPendingInvites()]);
    friendRequests.value = requests.map((request) => ({ id: request.id, name: null }));
    invites.value = pending.map(toGroupInvite);
  } catch {
    friendRequests.value = [];
    invites.value = [];
    invitesError.value = 'We could not load your invites. Please refresh the page.';
  } finally {
    loadingInvites.value = false;
  }
}

async function loadFriendsReading() {
  if (!isSignedIn.value) return;

  loadingReadingNow.value = true;
  readingNowError.value = null;

  try {
    const friends = await getFriendsReading();
    friendsReading.value = friends.map((friend) => ({
      id: friend.userId,
      initials: initialsOf(friend.displayName),
      name: friend.displayName,
      book: friend.book.title,
      readingNow: friend.readingNow,
    }));
  } catch {
    friendsReading.value = [];
    readingNowError.value =
      'We could not load what your friends are reading. Please refresh the page.';
  } finally {
    loadingReadingNow.value = false;
  }
}

async function loadCircle() {
  if (!isSignedIn.value) return;

  loadingCircle.value = true;
  circleError.value = null;

  try {
    circleComments.value = (await getCircleComments()).map(toCircleComment);
  } catch {
    circleComments.value = [];
    circleError.value = 'We could not load your circle. Please refresh the page.';
  } finally {
    loadingCircle.value = false;
  }
}

async function respondToFriend(request: HomeFriendRequest, accept: boolean) {
  if (answering.value) return;

  answering.value = `friend-${request.id}`;
  try {
    if (isSignedIn.value) await answerFriendRequest(request.id, accept ? 'accept' : 'decline');
    const name = request.name ?? 'the reader';
    invitesMessage.value = accept
      ? `You and ${name} are now friends.`
      : `You declined ${name}'s request.`;
    friendRequests.value = friendRequests.value.filter((item) => item.id !== request.id);
  } catch (error) {
    invitesMessage.value =
      error instanceof Error ? error.message : 'Could not answer the friend request';
  } finally {
    answering.value = null;
  }
}

async function respondToInvite(invite: HomeGroupInvite, accept: boolean) {
  if (answering.value) return;

  answering.value = `invite-${invite.id}`;
  try {
    if (isSignedIn.value) await answerInvite(invite.id, accept ? 'accept' : 'decline');
    invitesMessage.value = accept ? `You joined ${invite.title}.` : `You declined ${invite.title}.`;
    invites.value = invites.value.filter((item) => item.id !== invite.id);
    if (accept && isSignedIn.value) await loadGroups();
  } catch (error) {
    invitesMessage.value = error instanceof Error ? error.message : 'Could not answer the invite';
  } finally {
    answering.value = null;
  }
}

onMounted(() => {
  void loadReading();
  void loadGroups();
  void loadInvites();
  void loadFriendsReading();
  void loadCircle();
});
</script>

<template>
  <main class="page-column home">
    <header class="greeting">
      <h1>Good morning, {{ firstName }}.</h1>
      <p class="greeting-line">{{ greetingDate }}</p>
    </header>

    <section class="bedside" aria-labelledby="bedside-title">
      <template v-if="hero">
        <RouterLink
          class="bedside-cover"
          :to="`/library/${hero.id}`"
          tabindex="-1"
          aria-hidden="true"
        >
          <BookCoverImage :src="hero.cover" :title="hero.title" />
        </RouterLink>
        <div class="bedside-body">
          <h2 id="bedside-title" class="bedside-title">{{ hero.title }}</h2>
          <p class="bedside-author">
            {{ hero.author
            }}<template v-if="hero.club"> · reading with the {{ hero.club }}</template>
          </p>
          <div class="bedside-progress">
            <progress
              class="progress-bar"
              :value="hero.currentPage"
              :max="hero.pages"
              :aria-label="`${hero.title} progress`"
            ></progress>
            <p class="progress-label">
              <span>Page {{ hero.currentPage }} of {{ hero.pages }} · {{ hero.percent }}%</span>
              <span class="muted">{{ hero.pagesToGo }} pages to go</span>
            </p>
          </div>
          <div class="bedside-actions">
            <RouterLink class="button" :to="`/session/${hero.id}`">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5.5v13l10-6.5z" />
              </svg>
              {{ isResuming ? 'Resume session' : 'Start session' }}
            </RouterLink>
            <RouterLink class="text-link" :to="`/library/${hero.id}`">Book details</RouterLink>
          </div>
          <p v-if="isResuming" class="last-session">
            Session in progress · {{ activeSession?.countedMinutes ?? 0 }} min counted
          </p>
          <p v-else-if="hero.lastSession" class="last-session">{{ hero.lastSession }}</p>
        </div>
      </template>

      <template v-else-if="loadingReading">
        <span class="skeleton bedside-loading-cover" aria-hidden="true"></span>
        <div class="bedside-body bedside-loading-body" role="status" aria-busy="true">
          <span class="sr-only">Loading your reading…</span>
          <span class="skeleton loading-title" aria-hidden="true"></span>
          <span class="skeleton loading-subtitle" aria-hidden="true"></span>
          <span class="skeleton loading-progress" aria-hidden="true"></span>
          <span class="skeleton loading-meta" aria-hidden="true"></span>
          <div class="bedside-actions" aria-hidden="true">
            <span class="skeleton loading-button"></span>
            <span class="skeleton loading-link"></span>
          </div>
        </div>
      </template>

      <div v-else class="bedside-empty">
        <p v-if="readingError" class="section-error" role="alert">{{ readingError }}</p>
        <template v-else>
          <h2 id="bedside-title" class="bedside-title">
            {{ hasBooks ? 'Nothing in progress' : 'Your library is empty' }}
          </h2>
          <p class="section-empty">
            <template v-if="hasBooks">
              Pick up a book from your library to start your next session.
            </template>
            <template v-else>
              Add your first book or explore books to find your next read.
            </template>
          </p>
          <div class="bedside-actions">
            <RouterLink class="button" to="/explore">Explore books</RouterLink>
            <RouterLink class="text-link" to="/library">Go to your library</RouterLink>
          </div>
        </template>
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

    <section v-if="alsoReading.length" class="section also-reading" aria-labelledby="also-title">
      <h2 id="also-title" class="section-title heading-gap">Also in progress</h2>
      <ul class="reading-list">
        <li v-for="book in alsoReading" :key="book.id">
          <RouterLink
            class="reading-cover"
            :to="`/library/${book.id}`"
            tabindex="-1"
            aria-hidden="true"
          >
            <BookCoverImage :src="book.cover" :title="book.title" />
          </RouterLink>
          <div class="reading-body">
            <p class="reading-title">{{ book.title }}</p>
            <p class="reading-meta">
              {{ book.author }} · page {{ book.currentPage }} of {{ book.pages }} ·
              {{ book.percent }}%
            </p>
            <progress
              class="progress-bar"
              :value="book.currentPage"
              :max="book.pages"
              :aria-label="`${book.title} progress`"
            ></progress>
          </div>
          <RouterLink class="button button-small reading-action" :to="`/session/${book.id}`">
            Start session
          </RouterLink>
        </li>
      </ul>
    </section>

    <div class="columns">
      <div class="column">
        <section class="section ruled" aria-labelledby="groups-title">
          <div class="section-heading heading-gap">
            <h2 id="groups-title" class="section-title">Your groups</h2>
            <RouterLink class="text-link" to="/groups">All groups</RouterLink>
          </div>
          <div v-if="loadingGroups" role="status" aria-busy="true">
            <span class="sr-only">Loading your groups…</span>
            <div class="skeleton-groups" aria-hidden="true">
              <div v-for="n in 2" :key="n" class="skeleton-group-row">
                <span class="skeleton skeleton-tile"></span>
                <div class="skeleton-group-body">
                  <span class="skeleton loading-row-title"></span>
                  <span class="skeleton loading-row-meta"></span>
                  <span class="skeleton loading-row-bar"></span>
                </div>
              </div>
            </div>
          </div>
          <p v-else-if="groupsError" class="section-error" role="alert">{{ groupsError }}</p>
          <p v-else-if="!hasGroups" class="section-empty">
            No active challenges or book clubs yet.
            <RouterLink class="text-link" to="/groups">Join or start one</RouterLink>
          </p>
          <ul v-else class="group-list">
            <li v-for="challenge in challenges" :key="challenge.id">
              <RouterLink
                class="rank-tile"
                :to="`/groups/${challenge.id}`"
                tabindex="-1"
                aria-hidden="true"
              >
                {{ challenge.rank === null ? '—' : `#${challenge.rank}` }}
                <span>of {{ challenge.readers }}</span>
              </RouterLink>
              <div class="group-body">
                <div class="group-line">
                  <RouterLink class="group-name" :to="`/groups/${challenge.id}`">
                    {{ challenge.name }}
                  </RouterLink>
                  <span class="section-meta">{{ challenge.daysLeft }}</span>
                </div>
                <p class="group-meta">
                  Challenge · {{ challenge.score ?? 'score not tracked yet' }}
                </p>
                <progress
                  class="progress-bar"
                  :value="challenge.progress"
                  max="100"
                  aria-label="Challenge progress"
                ></progress>
              </div>
            </li>
            <li v-for="club in clubs" :key="club.id">
              <RouterLink
                class="small-cover"
                :to="`/groups/${club.id}`"
                tabindex="-1"
                aria-hidden="true"
              >
                <BookCoverImage :src="club.bookCover" :title="club.bookTitle" />
              </RouterLink>
              <div class="group-body">
                <div class="group-line">
                  <RouterLink class="group-name" :to="`/groups/${club.id}`">
                    {{ club.name }}
                  </RouterLink>
                  <span class="section-meta">deadline {{ club.deadline }}</span>
                </div>
                <p class="group-meta">
                  Book club · {{ club.finished }} of {{ club.total }} finished ·
                  {{ club.progress }}%
                </p>
                <progress
                  class="progress-bar gold"
                  :value="club.progress"
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
          <div v-if="loadingCircle" role="status" aria-busy="true">
            <span class="sr-only">Loading comments from your groups…</span>
            <ul class="activity" aria-hidden="true">
              <li v-for="n in 3" :key="n" class="skeleton-activity-row">
                <span class="skeleton skeleton-avatar"></span>
                <div class="skeleton-row-body">
                  <span class="skeleton loading-row-title"></span>
                  <span class="skeleton loading-row-meta"></span>
                </div>
              </li>
            </ul>
          </div>
          <p v-else-if="circleError" class="section-error" role="alert">{{ circleError }}</p>
          <ul v-else-if="circleComments.length" class="activity">
            <li v-for="item in circleComments" :key="item.id">
              <MemberAvatar :initials="item.initials" />
              <div>
                <p class="activity-title">
                  <RouterLink v-if="item.to" class="activity-link" :to="item.to">
                    {{ item.title }}
                  </RouterLink>
                  <template v-else>{{ item.title }}</template>
                </p>
                <p class="activity-detail">{{ item.detail }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="section-empty">No comments in your groups yet.</p>
        </section>
      </div>

      <aside class="column" aria-label="Your reading at a glance">
        <section class="section ruled" aria-labelledby="now-title">
          <h2 id="now-title" class="section-title heading-gap">Reading now</h2>
          <div v-if="loadingReadingNow" role="status" aria-busy="true">
            <span class="sr-only">Looking for your friends…</span>
            <ul class="reading-now" aria-hidden="true">
              <li v-for="n in 3" :key="n">
                <span class="skeleton skeleton-avatar-sm"></span>
                <span class="skeleton loading-row-meta"></span>
              </li>
            </ul>
          </div>
          <p v-else-if="readingNowError" class="section-error" role="alert">
            {{ readingNowError }}
          </p>
          <ul v-else-if="friendsReading.length" class="reading-now">
            <li v-for="friend in friendsReading" :key="friend.id">
              <MemberAvatar :initials="friend.initials" size="sm" />
              <span>
                {{ friend.name }}
                <span class="muted"
                  >· <cite>{{ friend.book }}</cite></span
                >
                <span
                  v-if="friend.readingNow"
                  class="now-dot"
                  role="img"
                  aria-label="Reading right now"
                ></span>
              </span>
            </li>
          </ul>
          <p v-else class="section-empty">None of your friends are reading a book right now.</p>
        </section>

        <section class="section" aria-labelledby="waiting-title">
          <h2 id="waiting-title" class="section-title heading-gap">Waiting for you</h2>
          <div v-if="loadingInvites" class="requests" role="status" aria-busy="true">
            <span class="sr-only">Loading your invites…</span>
            <div v-for="n in 2" :key="n" class="skeleton-invite" aria-hidden="true">
              <span class="skeleton loading-row-title"></span>
              <div class="request-actions">
                <span class="skeleton loading-button-small"></span>
                <span class="skeleton loading-button-small"></span>
              </div>
            </div>
          </div>
          <p v-else-if="invitesError" class="section-error" role="alert">{{ invitesError }}</p>
          <div v-else-if="hasInvites" class="requests">
            <div v-for="request in friendRequests" :key="request.id">
              <p class="request-line">
                <strong>{{ request.name ?? 'A reader' }}</strong> wants to be friends
              </p>
              <div class="request-actions">
                <button
                  type="button"
                  class="button button-small"
                  :disabled="answering !== null"
                  @click="respondToFriend(request, true)"
                >
                  Accept
                </button>
                <button
                  type="button"
                  class="button-outline"
                  :disabled="answering !== null"
                  @click="respondToFriend(request, false)"
                >
                  Decline
                </button>
              </div>
            </div>
            <div v-for="invite in invites" :key="invite.id">
              <p class="request-line">
                <strong>{{ invite.title }}</strong> · {{ invite.detail }}
              </p>
              <div class="request-actions">
                <button
                  type="button"
                  class="button button-small"
                  :disabled="answering !== null"
                  @click="respondToInvite(invite, true)"
                >
                  Accept
                </button>
                <button
                  type="button"
                  class="button-outline"
                  :disabled="answering !== null"
                  @click="respondToInvite(invite, false)"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
          <p v-else class="section-empty">No pending invites.</p>
        </section>
        <p v-if="invitesMessage" class="note status" role="status">{{ invitesMessage }}</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.home {
  /* The app shell is a flex column; without a width the centred column shrinks to its content */
  width: 100%;
  padding-block: var(--space-12) 56px;
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
  overflow: hidden;
  border-radius: 12px;
  box-shadow: var(--shadow-cover);
  transition: transform var(--duration-fast) var(--ease-out);
}

.bedside-cover:hover {
  transform: translateY(-2px);
}

.bedside-body {
  min-width: 0;
}

.bedside-empty {
  grid-column: 1 / span 2;
  min-width: 0;
}

.bedside-loading-cover {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
}

.bedside-loading-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  display: block;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-surface-muted) 25%,
    var(--color-surface-hover) 37%,
    var(--color-surface-muted) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.loading-title {
  width: 55%;
  height: 1.9rem;
}

.loading-subtitle {
  width: 70%;
  height: 0.9rem;
}

.loading-progress {
  height: 6px;
  margin-top: 10px;
}

.loading-meta {
  width: 45%;
  height: 0.75rem;
}

.loading-button {
  width: 8.5rem;
  height: 2.25rem;
  border-radius: 999px;
}

.loading-link {
  width: 6rem;
  height: 0.9rem;
}

.loading-row-title {
  width: 45%;
  height: 0.85rem;
}

.loading-row-meta {
  width: 65%;
  height: 0.7rem;
}

.loading-row-bar {
  width: 100%;
  height: 6px;
  margin-top: 4px;
}

.skeleton-groups {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.skeleton-group-row {
  display: flex;
  gap: 20px;
  align-items: center;
}

.skeleton-tile {
  flex: none;
  width: 64px;
  aspect-ratio: 2 / 3;
  border-radius: 3px;
}

.skeleton-group-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.skeleton-activity-row {
  align-items: flex-start;
}

.skeleton-avatar {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.skeleton-avatar-sm {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
}

.skeleton-row-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.skeleton-invite {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skeleton-invite .request-actions {
  margin-top: 8px;
}

.loading-button-small {
  width: 4.5rem;
  height: 1.9rem;
  border-radius: 999px;
}

.section-empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.section-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.also-reading {
  border-bottom: 1px solid var(--color-border);
}

.reading-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.reading-list li {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  column-gap: 20px;
  align-items: center;
  padding-block: var(--space-4);
}

.reading-list li:first-child {
  padding-top: 0;
}

.reading-list li:last-child {
  padding-bottom: 0;
}

.reading-list li + li {
  border-top: 1px solid var(--color-border);
}

.reading-cover {
  display: block;
  width: 56px;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: var(--shadow-cover);
  transition: transform var(--duration-fast) var(--ease-out);
}

.reading-cover:hover {
  transform: translateY(-2px);
}

.reading-body {
  width: 100%;
  max-width: 40rem;
  min-width: 0;
}

.reading-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
}

.reading-meta {
  margin: 2px 0 var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.reading-action {
  justify-self: end;
  white-space: nowrap;
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
  padding: var(--space-10) 0 var(--space-8);
}

.ruled {
  border-bottom: 1px solid var(--color-border);
}

.heading-gap {
  margin-bottom: var(--space-6);
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
  overflow: hidden;
  border-radius: 10px;
  box-shadow: var(--shadow-cover);
  transition: transform var(--duration-fast) var(--ease-out);
}

.small-cover:hover {
  transform: translateY(-2px);
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

.activity-link {
  color: inherit;
  text-decoration: none;
}

.activity-link:hover {
  color: var(--color-primary);
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

.now-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--color-primary);
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

@keyframes shimmer {
  from {
    background-position: 100% 50%;
  }

  to {
    background-position: 0 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    background: var(--color-surface-muted);
    animation: none;
  }
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

  .bedside-empty {
    grid-column: auto;
  }

  .bedside-cover,
  .bedside-loading-cover {
    width: 140px;
  }

  .glance {
    padding-top: var(--space-6);
    padding-left: 0;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .reading-list li {
    grid-template-columns: 48px minmax(0, 1fr);
    gap: var(--space-3) var(--space-4);
    align-items: start;
  }

  .reading-cover {
    width: 48px;
  }

  .reading-action {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
