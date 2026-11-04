<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import BookPicker, { type PickedBook } from '@/components/groups/BookPicker.vue';
import GroupChat from '@/components/groups/GroupChat.vue';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard.vue';
import GroupsPageHeader from '@/components/groups/GroupsPageHeader.vue';
import InfoNote from '@/components/groups/InfoNote.vue';
import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import ToggleSwitch from '@/components/groups/ToggleSwitch.vue';
import { mockCurrentMemberId } from '@/mocks/groups';
import {
  getFriends,
  inviteToGroup,
  openPoll,
  proposeBook,
  startNextRound,
  voteForProposal,
} from '@/services/api';
import type { BookClubDetail, GroupMember, ProposalOption } from '@/types/groups';
import { toIsoDate } from '@/utils/groups';

// A club from the API (`live`) saves every action and asks the parent to reload
// (`changed`); the mock club keeps its changes on this page.
const props = withDefaults(
  defineProps<{
    club: BookClubDetail;
    /** The viewing reader's member id; the mock page uses Eleanor. */
    meId?: string;
    live?: boolean;
  }>(),
  { meId: mockCurrentMemberId, live: false },
);
const emit = defineEmits<{ changed: [] }>();

const me = props.club.members.find((m) => m.id === props.meId) ?? {
  id: props.meId,
  name: 'You',
  initials: 'YO',
  handle: '',
};
const book = props.club.round.book;

const options = ref<ProposalOption[]>(props.club.voting?.options.map((o) => ({ ...o })) ?? []);
const yourVote = ref<string | null>(props.club.voting?.yourVote ?? null);
const voted = ref(props.club.voting?.voted ?? 0);
const anonymous = ref(props.club.voting?.anonymous ?? true);
const changingVote = ref(false);
const proposal = ref('');
const pickedProposal = ref<PickedBook | null>(null);
const proposalMessage = ref('');
const actionError = ref('');
const showHistory = ref(false);
const showAdmin = ref(false);
/** A cover that fails to load shows the title placeholder instead. */
const coverFailed = ref(false);

// Admin panel (live clubs)
const friends = ref<GroupMember[]>([]);
const invited = ref<string[]>([]);
const inviteMessage = ref('');
const pollCloses = ref(toIsoDate(new Date(Date.now() + 7 * 86_400_000)));
const pollAnonymous = ref(true);
const nextBook = ref<PickedBook | null>(null);
const nextDeadline = ref(toIsoDate(new Date(Date.now() + 30 * 86_400_000)));

const percent = computed(() =>
  props.club.yourProgress.pages
    ? Math.round((props.club.yourProgress.page / props.club.yourProgress.pages) * 100)
    : 0,
);
const finishedPercent = computed(() =>
  props.club.finished.total
    ? Math.round((props.club.finished.count / props.club.finished.total) * 100)
    : 0,
);
const maxVotes = computed(() => Math.max(1, ...options.value.map((o) => o.votes)));
const votingOpen = computed(() => props.club.voting?.status === 'open');
const canVote = computed(() => votingOpen.value && (changingVote.value || !yourVote.value));
const invitable = computed(() =>
  friends.value.filter((f) => !props.club.members.some((m) => m.id === f.id)),
);
const bookMeta = computed(() =>
  [book.pages ? `${book.pages} pages` : '', book.author, 'Selected for this round']
    .filter(Boolean)
    .join(' · '),
);

/** Runs a live action, shows its error, and asks the page to reload on success. */
async function act(work: () => Promise<unknown>, onDone?: () => void) {
  actionError.value = '';
  try {
    await work();
    onDone?.();
    emit('changed');
  } catch (e) {
    actionError.value = (e as Error).message;
  }
}

async function castVote(option: ProposalOption) {
  if (props.live) {
    await act(() => voteForProposal(props.club.id, option.id, props.meId));
    return;
  }
  const previous = options.value.find((o) => o.id === yourVote.value);
  if (previous) previous.votes -= 1;
  else voted.value += 1;
  option.votes += 1;
  yourVote.value = option.id;
  changingVote.value = false;
}

async function submitProposal() {
  if (props.live) {
    const picked = pickedProposal.value;
    if (!picked) return;
    await act(
      () => proposeBook(props.club.id, picked.id, props.meId),
      () => (pickedProposal.value = null),
    );
    return;
  }
  const title = proposal.value.trim();
  if (!title) return;
  options.value.push({
    id: `proposal-${options.value.length}`,
    title,
    author: 'Proposed by you',
    votes: 0,
  });
  proposal.value = '';
  proposalMessage.value = `${title} was added to the vote.`;
}

async function toggleAdmin() {
  showAdmin.value = !showAdmin.value;
  if (!showAdmin.value || !props.live || friends.value.length) return;
  try {
    friends.value = await getFriends(props.meId);
  } catch (e) {
    actionError.value = (e as Error).message;
  }
}

async function invite(friend: GroupMember) {
  actionError.value = '';
  try {
    await inviteToGroup(props.club.id, friend.id, props.meId);
    invited.value.push(friend.id);
    inviteMessage.value = `Invite sent to ${friend.name}.`;
  } catch (e) {
    actionError.value = (e as Error).message;
  }
}

async function openVote() {
  const closesAt = new Date(`${pollCloses.value}T18:00:00`).toISOString();
  await act(() =>
    openPoll(props.club.id, { closesAt, anonymous: pollAnonymous.value }, props.meId),
  );
}

async function startRound() {
  const picked = nextBook.value;
  if (!picked) return;
  await act(() =>
    startNextRound(props.club.id, { bookId: picked.id, deadline: nextDeadline.value }, props.meId),
  );
}
</script>

<template>
  <main class="page-column club">
    <GroupsPageHeader
      :eyebrow="`Groups / ${club.name} book club`"
      :title="club.title"
      :subtitle="club.subtitle"
    >
      <template v-if="!live || club.isAdmin" #action>
        <button
          type="button"
          class="button-outline"
          :aria-expanded="showAdmin"
          aria-controls="admin-panel"
          @click="toggleAdmin"
        >
          Admin &amp; settings
        </button>
      </template>
    </GroupsPageHeader>

    <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>

    <section v-if="showAdmin" id="admin-panel" class="panel admin" aria-labelledby="admin-title">
      <h2 id="admin-title" class="panel-heading">Admin &amp; settings</h2>
      <p v-if="!live" class="lede">Only {{ club.adminName }} can change this club.</p>
      <div v-else class="admin-grid">
        <div class="admin-block">
          <h3 class="block-title">Invite friends</h3>
          <ul v-if="invitable.length" class="invite-list">
            <li v-for="friend in invitable" :key="friend.id">
              <MemberAvatar :initials="friend.initials" />
              <span class="friend-name">{{ friend.name }}</span>
              <button
                type="button"
                class="button-outline button-small"
                :disabled="invited.includes(friend.id)"
                @click="invite(friend)"
              >
                {{ invited.includes(friend.id) ? 'Invited' : 'Invite' }}
              </button>
            </li>
          </ul>
          <p v-else class="lede">All your friends are already here.</p>
          <p v-if="inviteMessage" class="lede" role="status">{{ inviteMessage }}</p>
        </div>

        <form class="admin-block" @submit.prevent="openVote">
          <h3 class="block-title">Open a vote for the next book</h3>
          <label for="poll-closes" class="field-label">Voting closes (18:00)</label>
          <input id="poll-closes" v-model="pollCloses" type="date" class="field" />
          <ToggleSwitch
            v-model="pollAnonymous"
            label="Anonymous proposals"
            description="Members see the books and totals, not who proposed them."
          />
          <button type="submit" class="button-outline" :disabled="votingOpen">Open voting</button>
          <p v-if="votingOpen" class="lede">A vote is already open.</p>
        </form>

        <form class="admin-block" @submit.prevent="startRound">
          <h3 class="block-title">Start the next round</h3>
          <BookPicker
            v-model="nextBook"
            input-id="next-book"
            label="Next book"
            placeholder="Search title…"
          />
          <label for="next-deadline" class="field-label">Deadline</label>
          <input id="next-deadline" v-model="nextDeadline" type="date" class="field" />
          <button type="submit" class="button" :disabled="!club.roundOver || !nextBook">
            Start next round
          </button>
          <p v-if="!club.roundOver" class="lede">
            Available once everyone finishes or the deadline passes.
          </p>
        </form>
      </div>
    </section>

    <section class="panel round" aria-labelledby="round-title">
      <div class="round-book">
        <img
          v-if="book.cover && !coverFailed"
          :src="book.cover"
          :alt="`Cover of ${book.title}`"
          @error="coverFailed = true"
        />
        <div v-else class="cover-placeholder" aria-hidden="true">{{ book.title }}</div>
        <div>
          <span class="tag tag-highlight">{{ club.round.label }}</span>
          <h2 id="round-title" class="book-title">{{ book.title }}</h2>
          <p class="book-meta">{{ bookMeta }}</p>
          <RouterLink
            class="button-outline"
            :to="{ name: 'book-detail', params: { bookId: book.id } }"
          >
            Open book details
          </RouterLink>
        </div>
      </div>

      <div class="round-progress">
        <p class="finished">{{ club.finished.count }} of {{ club.finished.total }} finished</p>
        <progress
          class="progress-bar gold"
          max="100"
          :value="finishedPercent"
          :aria-label="`${club.finished.count} of ${club.finished.total} members finished`"
        ></progress>
        <p class="deadline">Deadline: {{ club.deadline }}</p>
        <p class="lede">The round succeeds only if every member finishes before the deadline.</p>
      </div>

      <div class="round-action">
        <p class="days">{{ club.daysLeft }}</p>
        <p class="lede">
          Your progress: {{ club.yourProgress.page }}/{{ club.yourProgress.pages }} pages ·
          {{ percent }}%
        </p>
        <RouterLink class="button" :to="{ name: 'active-session', params: { bookId: book.id } }">
          Start {{ book.title }} session
        </RouterLink>
      </div>
    </section>

    <div class="columns">
      <div class="column">
        <section class="panel" aria-labelledby="progress-title">
          <h2 id="progress-title" class="panel-heading">Progress &amp; counted minutes</h2>
          <p class="lede">Leaderboard sorted by counted {{ book.title }} minutes.</p>
          <GroupLeaderboard with-progress :entries="club.leaderboard" :me-id="meId" />
          <InfoNote class="counts" title="Only our selected book counts">
            {{ book.title }} sessions contribute to this round. Other books, imported estimates and
            manual minutes don’t.
            <template v-if="!live">Daily cap: 120 min; timer on; other checks off.</template>
            <template v-else>Simple timer; finished sessions only.</template>
          </InfoNote>
        </section>
        <button
          type="button"
          class="button-outline history-toggle"
          :aria-expanded="showHistory"
          @click="showHistory = !showHistory"
        >
          Past rounds &amp; history <span aria-hidden="true">{{ showHistory ? '↑' : '→' }}</span>
        </button>
        <section v-if="showHistory" class="panel history" aria-label="Past rounds">
          <ul v-if="club.history.length">
            <li v-for="item in club.history" :key="item.label">
              <p class="eyebrow">{{ item.label }}</p>
              <p class="history-summary">{{ item.summary }}</p>
              <p class="lede">{{ item.note }}</p>
            </li>
          </ul>
          <p v-else class="lede">This is the club’s first round.</p>
        </section>
      </div>

      <section class="panel" aria-labelledby="conversation-title">
        <h2 id="conversation-title" class="panel-heading chat-heading">Club conversation</h2>
        <GroupChat
          :messages="club.messages"
          :me="me"
          :group-id="live ? club.id : undefined"
          label="Message your club"
          placeholder="Write a thought, or share a passage…"
        />
      </section>

      <section class="panel" aria-labelledby="voting-title">
        <h2 id="voting-title" class="panel-heading">Our next chapter</h2>
        <template v-if="club.voting">
          <p class="tags">
            <span class="tag tag-highlight">{{
              votingOpen ? 'Voting open' : 'Voting closed'
            }}</span>
          </p>
          <p class="lede">
            Propose a book for the next round. Voting
            {{ votingOpen ? 'closes' : 'closed' }} {{ club.voting.closes }}.
          </p>

          <form v-if="votingOpen" class="proposal" @submit.prevent="submitProposal">
            <BookPicker
              v-if="live"
              v-model="pickedProposal"
              input-id="proposal-title"
              label="Propose a title"
              placeholder="Search book title…"
            />
            <template v-else>
              <label for="proposal-title" class="field-label">Propose a title</label>
              <input
                id="proposal-title"
                v-model="proposal"
                type="text"
                placeholder="Search book title or ISBN…"
              />
            </template>
            <button type="submit" class="button-outline submit-proposal">Submit proposal</button>
            <p v-if="proposalMessage" class="lede" role="status">{{ proposalMessage }}</p>
          </form>

          <ul class="options">
            <li v-for="option in options" :key="option.id">
              <p class="option-title">{{ option.title }}</p>
              <p class="option-meta">
                <template v-if="option.author">{{ option.author }} · </template>
                {{ option.votes }} {{ option.votes === 1 ? 'vote' : 'votes' }}
                <template v-if="yourVote === option.id">
                  · your vote <span aria-hidden="true">✓</span></template
                >
              </p>
              <progress
                class="progress-bar gold"
                :max="maxVotes"
                :value="option.votes"
                :aria-label="`${option.title}: ${option.votes} votes`"
              ></progress>
              <button
                v-if="canVote && yourVote !== option.id"
                type="button"
                class="button-outline pick"
                @click="castVote(option)"
              >
                Vote for {{ option.title }}
              </button>
            </li>
          </ul>
          <p v-if="!options.length" class="lede">No proposals yet. Be the first.</p>

          <ToggleSwitch
            v-if="!live"
            v-model="anonymous"
            label="Anonymous voting"
            description="Members see totals, not who voted."
          />
          <p v-else class="lede">
            {{
              anonymous
                ? 'Anonymous proposals: members see totals, not who proposed.'
                : 'Named proposals.'
            }}
          </p>
          <p class="lede">
            One vote per member. Change yours until voting closes. {{ voted }} of
            {{ club.voting.total }} have voted.
          </p>
          <button
            v-if="votingOpen && yourVote"
            type="button"
            class="button-outline"
            @click="changingVote = !changingVote"
          >
            {{ changingVote ? 'Keep my vote' : 'Change my vote' }}
          </button>
        </template>
        <p v-else class="lede">
          No vote is open yet.
          <template v-if="club.isAdmin">Open one from Admin &amp; settings.</template>
          <template v-else>{{ club.adminName }} opens it when it’s time to choose.</template>
        </p>

        <InfoNote class="admin-note" title="The final selection is the admin’s">
          {{ club.adminName }} confirms the next book after voting closes. A winning proposal isn’t
          automatically selected.
        </InfoNote>
      </section>
    </div>
  </main>
</template>

<style scoped>
.club {
  padding-block: var(--space-8);
}

.round {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr);
  gap: var(--space-8);
  align-items: center;
}

.round-book {
  display: flex;
  gap: var(--space-6);
  align-items: center;
}

.round-book img {
  width: 5.5rem;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-cover);
  box-shadow: var(--shadow-cover);
}

.book-title {
  margin: var(--space-2) 0;
  font-size: var(--font-size-xl);
}

.book-meta {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.finished {
  margin: 0 0 var(--space-3);
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
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

.deadline {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-sm);
}

.days {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.round-action .button {
  margin-top: var(--space-2);
}

.lede {
  margin: var(--space-3) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-6);
  align-items: start;
}

.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  align-items: flex-start;
}

.column > .panel {
  align-self: stretch;
}

.counts,
.admin-note {
  margin-top: var(--space-4);
}

.chat-heading {
  margin-bottom: var(--space-4);
}

.tags {
  margin: var(--space-3) 0;
}

.proposal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.field-label {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.proposal input {
  width: 100%;
  height: var(--control-height);
  margin-bottom: var(--space-3);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-4) 0;
  padding: 0;
  list-style: none;
}

.option-title,
.option-meta {
  margin: 0;
}

.option-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.option-meta {
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.pick {
  margin-top: var(--space-2);
}

.proposal > .picker {
  align-self: stretch;
}

.submit-proposal {
  margin-top: var(--space-3);
}

.action-error {
  margin: 0 0 var(--space-4);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
}

.admin {
  margin-bottom: var(--space-6);
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-4);
}

.admin-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.admin-block > * {
  align-self: stretch;
}

.admin-block > button {
  align-self: flex-start;
}

.block-title {
  margin: 0;
  font-size: var(--font-size-sm);
}

.field {
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.invite-list li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.friend-name {
  flex: 1;
  font-size: var(--font-size-sm);
}

.cover-placeholder {
  display: flex;
  flex-shrink: 0;
  align-items: flex-end;
  width: 5.5rem;
  aspect-ratio: 2 / 3;
  padding: var(--space-2);
  border-radius: var(--radius-cover);
  background: var(--color-copper);
  box-shadow: var(--shadow-cover);
  color: var(--color-cream);
  font-family: var(--font-heading);
  font-size: var(--font-size-xs);
}

.history ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-summary {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-sm);
}

@media (max-width: 1099px) {
  .round {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-6);
    align-items: start;
  }

  .columns,
  .admin-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 599px) {
  .round-book {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
