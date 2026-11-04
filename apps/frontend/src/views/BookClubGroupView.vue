<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import BookPicker, { type PickedBook } from '@/components/groups/BookPicker.vue';
import GroupChat from '@/components/groups/GroupChat.vue';
import GroupLeaderboard from '@/components/groups/GroupLeaderboard.vue';
import MemberAvatar from '@/components/groups/MemberAvatar.vue';
import ToggleSwitch from '@/components/groups/ToggleSwitch.vue';
import PagePlate from '@/components/layout/PagePlate.vue';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
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
const anonymous = props.club.voting?.anonymous ?? true;
const changingVote = ref(false);
const proposal = ref('');
const pickedProposal = ref<PickedBook | null>(null);
const proposalMessage = ref('');
const actionError = ref('');
const showAdmin = ref(false);

// Admin panel (live clubs)
const friends = ref<GroupMember[]>([]);
const invited = ref<string[]>([]);
const inviteMessage = ref('');
const pollCloses = ref(toIsoDate(new Date(Date.now() + 7 * 86_400_000)));
const pollAnonymous = ref(true);
const nextBook = ref<PickedBook | null>(null);
const nextDeadline = ref(toIsoDate(new Date(Date.now() + 30 * 86_400_000)));

const maxVotes = computed(() => Math.max(1, ...options.value.map((o) => o.votes)));
const votingOpen = computed(() => props.club.voting?.status === 'open');
const canVote = computed(() => votingOpen.value && (changingVote.value || !yourVote.value));
const invitable = computed(() =>
  friends.value.filter((f) => !props.club.members.some((m) => m.id === f.id)),
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
  <main class="club">
    <PagePlate :title="club.name" title-id="club-title">
      <template #leading>
        <div class="plate-cover">
          <BookCoverImage :src="book.cover" :title="book.title" />
        </div>
      </template>
      <p>
        Book club · {{ club.round.label }} · {{ club.members.length }}
        {{ club.members.length === 1 ? 'member' : 'members' }}
      </p>
      <p class="lede">
        Reading <cite>{{ book.title }}</cite
        ><template v-if="book.author"> by {{ book.author }}</template
        >, together by {{ club.deadline }}.
      </p>
      <template #actions>
        <RouterLink
          class="plate-button"
          :to="{ name: 'active-session', params: { bookId: book.id } }"
        >
          Start reading {{ book.title }}
        </RouterLink>
        <button
          v-if="!live || club.isAdmin"
          type="button"
          class="plate-link"
          :aria-expanded="showAdmin"
          aria-controls="admin-panel"
          @click="toggleAdmin"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
          </svg>
          Admin &amp; settings
        </button>
      </template>
    </PagePlate>

    <div class="page-column">
      <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>

      <section v-if="showAdmin" id="admin-panel" class="admin" aria-labelledby="admin-title">
        <h2 id="admin-title" class="section-title heading-gap">Admin &amp; settings</h2>
        <p v-if="!live" class="lede">Only {{ club.adminName }} can change this club.</p>
        <div v-else class="admin-grid">
          <div class="admin-block">
            <h3 class="block-title">Invite friends</h3>
            <ul v-if="invitable.length" class="invite-list">
              <li v-for="friend in invitable" :key="friend.id">
                <MemberAvatar :initials="friend.initials" size="sm" />
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
            <input id="poll-closes" v-model="pollCloses" type="date" class="field-input" />
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
            <input id="next-deadline" v-model="nextDeadline" type="date" class="field-input" />
            <button type="submit" class="button" :disabled="!club.roundOver || !nextBook">
              Start next round
            </button>
            <p v-if="!club.roundOver" class="lede">
              Available once everyone finishes or the deadline passes.
            </p>
          </form>
        </div>
      </section>

      <div class="columns">
        <div class="column">
          <section class="section ruled" aria-labelledby="round-title">
            <div class="section-heading">
              <h2 id="round-title" class="section-title">This round</h2>
              <span class="section-meta">
                {{ club.finished.count }} of {{ club.finished.total }} finished ·
                {{ club.daysLeft }}
              </span>
            </div>
            <p class="lede">
              The round succeeds when everyone finishes by {{ club.deadline }}. Only
              {{ book.title }} sessions count.
            </p>
            <GroupLeaderboard with-progress :entries="club.leaderboard" :me-id="me.id" />
          </section>

          <section class="section" aria-labelledby="conversation-title">
            <h2 id="conversation-title" class="section-title heading-gap">Club conversation</h2>
            <GroupChat
              :messages="club.messages"
              :me="me"
              :group-id="live ? club.id : undefined"
              :members="club.members"
              :is-admin="club.isAdmin"
              label="Message your club"
              placeholder="Write a thought, or share a passage"
            />
          </section>
        </div>

        <div class="column">
          <section class="section ruled" aria-labelledby="voting-title">
            <div class="section-heading">
              <h2 id="voting-title" class="section-title">Next book</h2>
              <span v-if="club.voting" class="section-meta">
                vote {{ votingOpen ? 'closes' : 'closed' }} {{ club.voting.closes }}
              </span>
            </div>

            <template v-if="club.voting">
              <ul class="options">
                <li v-for="option in options" :key="option.id">
                  <div class="option-line">
                    <span>
                      <span class="option-title">{{ option.title }}</span>
                      <span v-if="option.author" class="option-author">{{ option.author }}</span>
                    </span>
                    <span class="option-votes">
                      {{ option.votes }} {{ option.votes === 1 ? 'vote' : 'votes' }}
                    </span>
                  </div>
                  <progress
                    class="progress-bar gold"
                    :max="maxVotes"
                    :value="option.votes"
                    :aria-label="`${option.title}: ${option.votes} votes`"
                  ></progress>
                  <p v-if="yourVote === option.id" class="your-vote">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    Your vote
                  </p>
                  <button
                    v-if="canVote && yourVote !== option.id"
                    type="button"
                    class="link-button pick"
                    @click="castVote(option)"
                  >
                    Vote for {{ option.title }}
                  </button>
                </li>
              </ul>
              <p v-if="!options.length" class="lede">No proposals yet. Be the first.</p>

              <p class="lede">
                {{ voted }} of {{ club.voting.total }} have voted{{
                  anonymous ? ', anonymously' : ''
                }}. {{ club.adminName }} confirms the next book when voting closes.
              </p>
              <button
                v-if="votingOpen && yourVote"
                type="button"
                class="link-button change-vote"
                @click="changingVote = !changingVote"
              >
                {{ changingVote ? 'Keep my vote' : 'Change my vote' }}
              </button>

              <form v-if="votingOpen" class="proposal" @submit.prevent="submitProposal">
                <BookPicker
                  v-if="live"
                  v-model="pickedProposal"
                  input-id="proposal-title"
                  label="Propose a book"
                  placeholder="Search book title…"
                />
                <template v-else>
                  <label for="proposal-title" class="sr-only">Propose a book</label>
                  <input
                    id="proposal-title"
                    v-model="proposal"
                    class="field-input"
                    type="text"
                    placeholder="Propose a book"
                  />
                </template>
                <button type="submit" class="button-outline">Propose</button>
              </form>
              <p v-if="proposalMessage" class="lede" role="status">{{ proposalMessage }}</p>
            </template>
            <p v-else class="lede">
              No vote is open yet.
              <template v-if="club.isAdmin">Open one from Admin &amp; settings.</template>
              <template v-else>{{ club.adminName }} opens it when it’s time to choose.</template>
            </p>
          </section>

          <section class="section" aria-labelledby="past-title">
            <h2 id="past-title" class="section-title heading-gap">Past rounds</h2>
            <ul v-if="club.history.length" class="history">
              <li v-for="item in club.history" :key="item.label">
                <p class="history-label">{{ item.label }}</p>
                <p class="history-summary">{{ item.summary }}</p>
              </li>
            </ul>
            <p v-else class="lede">This is the club’s first round.</p>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.club {
  padding: 0;
}

.plate-cover {
  flex: none;
  width: 96px;
}

.plate-cover :deep(.cover) {
  box-shadow:
    0 0 0 1px rgb(255 230 167 / 45%),
    0 10px 20px -8px rgb(0 0 0 / 50%);
}

cite {
  font-family: var(--font-heading);
  font-style: italic;
}

.action-error {
  margin: var(--space-4) 0 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.admin {
  padding: var(--space-8) 0;
  border-bottom: 1px solid var(--color-border);
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-8);
}

.admin-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
  min-width: 0;
}

.admin-block .field-input {
  height: 40px;
}

.block-title {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: 600;
}

.field-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
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

.columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  column-gap: 64px;
}

.column {
  min-width: 0;
}

.section {
  padding: var(--space-10) 0;
}

.ruled {
  border-bottom: 1px solid var(--color-border);
}

.heading-gap {
  margin-bottom: 22px;
}

.lede {
  margin: 6px 0 var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 22px 0 var(--space-6);
  padding: 0;
  list-style: none;
}

.option-line {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.option-title {
  margin-right: var(--space-2);
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 600;
}

.option-author,
.option-votes {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.option-votes {
  flex: none;
  font-variant-numeric: tabular-nums;
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

.your-vote {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 6px 0 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.pick {
  margin-top: 6px;
  font-size: var(--font-size-xs);
}

.change-vote {
  font-size: var(--font-size-sm);
}

.proposal {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  margin-top: var(--space-6);
}

.proposal > :first-child {
  flex: 1;
  min-width: 0;
}

.proposal .field-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  font-size: var(--font-size-sm);
}

.proposal .button-outline {
  height: 40px;
}

.history {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-label,
.history-summary {
  margin: 0;
}

.history-label {
  font-weight: 600;
}

.history-summary {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

@media (max-width: 899px) {
  .columns,
  .admin-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .column:first-child .section:last-child {
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
