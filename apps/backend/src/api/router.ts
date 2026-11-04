import { Router } from 'express';
import type { DatabaseHealthCheck } from '../database/health-check.js';
import type { IBookRepository } from '../features/book/book-repository.js';
import { bookRoutes } from '../features/book/book-routes.js';
import { BookService } from '../features/book/book-service.js';
import type { LibraryQuery } from '../features/library/library-query.js';
import { libraryRoutes } from '../features/library/library-routes.js';
import type { IReadingStatusRepository } from '../features/reading-status/reading-status-repository.js';
import type { IReadingSessionRepository } from '../features/reading-session/reading-session-repository.js';
import { readingSessionRoutes } from '../features/reading-session/reading-session-routes.js';
import { ReadingSessionService } from '../features/reading-session/reading-session-service.js';
import { readingStatusRoutes } from '../features/reading-status/reading-status-routes.js';
import { ReadingStatusService } from '../features/reading-status/reading-status-service.js';
import type { IChallengeGroupRepository } from '../features/challenge-group/challenge-group-repository.js';
import { challengeGroupRoutes } from '../features/challenge-group/challenge-group-routes.js';
import { ChallengeGroupService } from '../features/challenge-group/challenge-group-service.js';
import type { StandingsQuery } from '../features/challenge-group/standings-query.js';
import type { IUserRepository } from '../features/user/user-repository.js';
import type { IBookClubRepository } from '../features/book-club/book-club-repository.js';
import { bookClubRoutes } from '../features/book-club/book-club-routes.js';
import { BookClubService } from '../features/book-club/book-club-service.js';
import type { IBookPollRepository } from '../features/book-club/book-poll-repository.js';
import { BookPollService } from '../features/book-club/book-poll-service.js';
import type { ClubProgressQuery } from '../features/book-club/club-progress-query.js';
import type { IFriendRepository } from '../features/friend/friend-repository.js';
import { friendRoutes } from '../features/friend/friend-routes.js';
import type { IChatRepository } from '../features/group-chat/chat-repository.js';
import { chatRoutes } from '../features/group-chat/chat-routes.js';
import { ChatService } from '../features/group-chat/chat-service.js';
import type { IGroupInviteRepository } from '../features/group-invite/group-invite-repository.js';
import { groupInviteRoutes } from '../features/group-invite/group-invite-routes.js';
import { GroupInviteService } from '../features/group-invite/group-invite-service.js';
import type { IGroupRosterRepository } from '../features/group/group-roster-repository.js';
import type { MemberJoinedListener } from '../features/group/group.js';
import { healthRoutes } from './health-routes.js';

export interface ApiDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
  libraryQuery?: LibraryQuery;
  readingSessionRepository?: IReadingSessionRepository;
  userRepository?: IUserRepository;
  challengeGroupRepository?: IChallengeGroupRepository;
  standingsQuery?: StandingsQuery;
  groupRosterRepository?: IGroupRosterRepository;
  chatRepository?: IChatRepository;
  friendRepository?: IFriendRepository;
  groupInviteRepository?: IGroupInviteRepository;
  bookClubRepository?: IBookClubRepository;
  bookPollRepository?: IBookPollRepository;
  clubProgressQuery?: ClubProgressQuery;
}

// Wires each feature's service to its dependencies by hand (no DI container) and
// mounts the routes whose dependencies were provided.
export function apiRouter(deps: ApiDependencies = {}): Router {
  const router = Router();
  const {
    healthCheck,
    bookRepository,
    readingStatusRepository,
    libraryQuery,
    readingSessionRepository,
    userRepository,
    challengeGroupRepository,
    standingsQuery,
    groupRosterRepository,
    chatRepository,
    friendRepository,
    groupInviteRepository,
    bookClubRepository,
    bookPollRepository,
    clubProgressQuery,
  } = deps;

  router.use(healthRoutes(healthCheck));

  if (bookRepository) {
    router.use(bookRoutes(new BookService(bookRepository)));
  }

  if (bookRepository && readingStatusRepository) {
    router.use(
      readingStatusRoutes(new ReadingStatusService(readingStatusRepository, bookRepository)),
    );
  }

  if (bookRepository && readingSessionRepository) {
    router.use(
      readingSessionRoutes(new ReadingSessionService(readingSessionRepository, bookRepository)),
    );
  }

  if (userRepository && challengeGroupRepository && standingsQuery) {
    router.use(
      challengeGroupRoutes(
        new ChallengeGroupService(challengeGroupRepository, userRepository),
        standingsQuery,
      ),
    );
  }

  // Who reacts when a reader accepts an invite (Observer): the chat announces them and
  // a book club adds its round book to their library.
  const joinListeners: MemberJoinedListener[] = [];

  if (userRepository && groupRosterRepository && chatRepository) {
    const chat = new ChatService(chatRepository, groupRosterRepository, userRepository);
    joinListeners.push(chat);
    router.use(chatRoutes(chat));
  }

  if (
    userRepository &&
    bookRepository &&
    readingStatusRepository &&
    chatRepository &&
    bookClubRepository &&
    bookPollRepository &&
    clubProgressQuery
  ) {
    const clubs = new BookClubService(
      bookClubRepository,
      userRepository,
      bookRepository,
      readingStatusRepository,
      bookPollRepository,
      chatRepository,
    );
    joinListeners.push(clubs);
    const polls = new BookPollService(
      bookPollRepository,
      bookClubRepository,
      bookRepository,
      chatRepository,
    );
    router.use(bookClubRoutes(clubs, polls, clubProgressQuery));
  }

  if (friendRepository) {
    router.use(friendRoutes(friendRepository));
  }

  if (userRepository && groupRosterRepository && friendRepository && groupInviteRepository) {
    router.use(
      groupInviteRoutes(
        new GroupInviteService(
          groupInviteRepository,
          groupRosterRepository,
          friendRepository,
          userRepository,
          joinListeners,
        ),
      ),
    );
  }

  if (libraryQuery) {
    router.use(libraryRoutes(libraryQuery));
  }

  return router;
}
