import { Router } from 'express';
import type { DatabaseHealthCheck } from '../database/health-check.js';
import type { BookCatalog } from '../features/book/book-catalog.js';
import type { IBookRepository } from '../features/book/book-repository.js';
import { bookRoutes } from '../features/book/book-routes.js';
import { exploreRoutes } from '../features/explore/explore-routes.js';
import { ExploreService } from '../features/explore/explore-service.js';
import { BookService } from '../features/book/book-service.js';
import type { LibraryQuery } from '../features/library/library-query.js';
import { libraryRoutes } from '../features/library/library-routes.js';
import type { IReadingStatusRepository } from '../features/reading-status/reading-status-repository.js';
import type { ReadingActivityQuery } from '../features/reading-session/reading-activity-query.js';
import type { IReadingSessionRepository } from '../features/reading-session/reading-session-repository.js';
import type { ReadingProgressQuery } from '../features/reading-status/reading-progress-query.js';
import { readingSessionRoutes } from '../features/reading-session/reading-session-routes.js';
import { ReadingSessionService } from '../features/reading-session/reading-session-service.js';
import type { IReviewRepository } from '../features/review/review-repository.js';
import type { ReviewQuery } from '../features/review/review-query.js';
import { reviewRoutes } from '../features/review/review-routes.js';
import { ReviewService } from '../features/review/review-service.js';
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
import { FriendService } from '../features/friend/friend-service.js';
import type { IGroupInviteRepository } from '../features/group-invite/group-invite-repository.js';
import { groupInviteRoutes } from '../features/group-invite/group-invite-routes.js';
import { GroupInviteService } from '../features/group-invite/group-invite-service.js';
import type { IGroupRosterRepository } from '../features/group/group-roster-repository.js';
import type { MemberJoinedListener } from '../features/group/group.js';
import type { IChatMessageRepository } from '../features/group-chat/chat-message-repository.js';
import type { ChatNotifier } from '../features/group-chat/chat-notifier.js';
import { NoopChatNotifier } from '../features/group-chat/chat-notifier.js';
import { chatRoutes } from '../features/group-chat/chat-routes.js';
import { ChatService } from '../features/group-chat/chat-service.js';
import type { GroupMembership } from '../features/group-chat/group-membership-query.js';
import { JoinAnnouncer } from '../features/group-chat/join-announcer.js';
import { DenyAllAuthProvider, type AuthProvider } from '../features/auth/auth-provider.js';
import { meRoutes } from '../features/user/me-routes.js';
import { UserService } from '../features/user/user-service.js';
import { authenticate, requireUser } from '../middleware/auth.js';
import { healthRoutes } from './health-routes.js';

export interface ApiDependencies {
  /** Verifies session tokens; without it every protected route answers 401. */
  authProvider?: AuthProvider;
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  /** Outside catalogue asked when a search finds few local books; local only without it. */
  bookCatalog?: BookCatalog;
  readingStatusRepository?: IReadingStatusRepository;
  libraryQuery?: LibraryQuery;
  readingSessionRepository?: IReadingSessionRepository;
  readingActivityQuery?: ReadingActivityQuery;
  readingProgressQuery?: ReadingProgressQuery;
  reviewRepository?: IReviewRepository;
  reviewQuery?: ReviewQuery;
  userRepository?: IUserRepository;
  challengeGroupRepository?: IChallengeGroupRepository;
  standingsQuery?: StandingsQuery;
  groupRosterRepository?: IGroupRosterRepository;
  friendRepository?: IFriendRepository;
  groupInviteRepository?: IGroupInviteRepository;
  bookClubRepository?: IBookClubRepository;
  bookPollRepository?: IBookPollRepository;
  clubProgressQuery?: ClubProgressQuery;
  chatMessageRepository?: IChatMessageRepository;
  groupMembership?: GroupMembership;
  /** Pushes chat events to sockets; defaults to no push (REST still works). */
  chatNotifier?: ChatNotifier;
  /** Receives the chat service once built, e.g. so the socket server can check membership. */
  onChatService?: (chat: ChatService) => void;
}

// Wires each feature's service to its dependencies by hand (no DI container) and
// mounts the routes whose dependencies were provided. Only /health and the username
// availability check are public; every other route needs a token and a users row.
export function apiRouter(deps: ApiDependencies = {}): Router {
  const router = Router();
  const {
    authProvider = new DenyAllAuthProvider(),
    healthCheck,
    bookRepository,
    bookCatalog,
    readingStatusRepository,
    libraryQuery,
    readingSessionRepository,
    readingActivityQuery,
    readingProgressQuery,
    reviewRepository,
    reviewQuery,
    userRepository,
    challengeGroupRepository,
    standingsQuery,
    groupRosterRepository,
    friendRepository,
    groupInviteRepository,
    bookClubRepository,
    bookPollRepository,
    clubProgressQuery,
    chatMessageRepository,
    groupMembership,
    chatNotifier = new NoopChatNotifier(),
    onChatService,
  } = deps;

  router.use(healthRoutes(healthCheck));

  const authenticated = authenticate(authProvider);
  const withUser = requireUser(userRepository);
  if (userRepository) {
    router.use(meRoutes(new UserService(userRepository), authenticated, withUser));
  }

  // Everything mounted below is protected (401 without a token, 403 PROFILE_REQUIRED without a profile).
  router.use(authenticated, withUser);

  if (bookRepository) {
    router.use(bookRoutes(new BookService(bookRepository, bookCatalog)));
  }

  const readingStatuses =
    bookRepository && readingStatusRepository
      ? new ReadingStatusService(readingStatusRepository, bookRepository)
      : undefined;

  if (readingStatuses) {
    router.use(readingStatusRoutes(readingStatuses));
  }

  if (
    bookRepository &&
    readingStatusRepository &&
    userRepository &&
    friendRepository &&
    reviewRepository &&
    reviewQuery
  ) {
    router.use(
      reviewRoutes(
        new ReviewService(
          reviewRepository,
          readingStatusRepository,
          bookRepository,
          userRepository,
          friendRepository,
          reviewQuery,
        ),
      ),
    );
  }

  if (bookRepository && readingSessionRepository) {
    router.use(
      readingSessionRoutes(
        new ReadingSessionService(
          readingSessionRepository,
          bookRepository,
          undefined,
          readingStatuses,
        ),
      ),
    );
  }

  const chat =
    chatMessageRepository && groupMembership
      ? new ChatService(chatMessageRepository, groupMembership, chatNotifier)
      : undefined;
  if (chat) {
    onChatService?.(chat);
    router.use(chatRoutes(chat));
  }

  if (userRepository && challengeGroupRepository && standingsQuery) {
    router.use(
      challengeGroupRoutes(
        new ChallengeGroupService(challengeGroupRepository, userRepository, undefined, chat),
        standingsQuery,
      ),
    );
  }

  // Who reacts when a reader accepts an invite (Observer): the chat announces them and
  // a book club adds its round book to their library.
  const joinListeners: MemberJoinedListener[] = [];

  if (userRepository && chat) {
    joinListeners.push(new JoinAnnouncer(chat, userRepository));
  }

  if (
    userRepository &&
    bookRepository &&
    readingStatusRepository &&
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
      undefined,
      chat,
    );
    joinListeners.push(clubs);
    const polls = new BookPollService(
      bookPollRepository,
      bookClubRepository,
      bookRepository,
      undefined,
      chat,
    );
    router.use(bookClubRoutes(clubs, polls, clubProgressQuery));
  }

  if (friendRepository && userRepository) {
    router.use(friendRoutes(new FriendService(friendRepository, userRepository)));
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

  if (bookRepository && readingActivityQuery && readingProgressQuery) {
    router.use(
      exploreRoutes(new ExploreService(readingActivityQuery, readingProgressQuery, bookRepository)),
    );
  }

  return router;
}
