import { createApp } from './app.js';
import { env } from './config/env.js';
import { DatabaseHealthCheck } from './database/health-check.js';
import { createPool, createDb } from './database/pool.js';
import { DrizzleBookRepository } from './features/book/book-repository.js';
import { DrizzleChallengeGroupRepository } from './features/challenge-group/challenge-group-repository.js';
import { StandingsQuery } from './features/challenge-group/standings-query.js';
import { DrizzleUserRepository } from './features/user/user-repository.js';
import { DrizzleBookClubRepository } from './features/book-club/book-club-repository.js';
import { DrizzleBookPollRepository } from './features/book-club/book-poll-repository.js';
import { ClubProgressQuery } from './features/book-club/club-progress-query.js';
import { DrizzleFriendRepository } from './features/friend/friend-repository.js';
import { DrizzleChatRepository } from './features/group-chat/chat-repository.js';
import { DrizzleGroupInviteRepository } from './features/group-invite/group-invite-repository.js';
import { DrizzleGroupRosterRepository } from './features/group/group-roster-repository.js';
import { DrizzleLibraryQuery } from './features/library/library-query.js';
import { DrizzleReadingSessionRepository } from './features/reading-session/reading-session-repository.js';
import { DrizzleReadingStatusRepository } from './features/reading-status/reading-status-repository.js';

const pool = createPool();
const db = createDb(pool);

const server = createApp({
  healthCheck: new DatabaseHealthCheck(pool),
  bookRepository: new DrizzleBookRepository(db),
  readingStatusRepository: new DrizzleReadingStatusRepository(db),
  libraryQuery: new DrizzleLibraryQuery(db),
  readingSessionRepository: new DrizzleReadingSessionRepository(db),
  userRepository: new DrizzleUserRepository(db),
  challengeGroupRepository: new DrizzleChallengeGroupRepository(db),
  standingsQuery: new StandingsQuery(db),
  groupRosterRepository: new DrizzleGroupRosterRepository(db),
  chatRepository: new DrizzleChatRepository(db),
  friendRepository: new DrizzleFriendRepository(db),
  groupInviteRepository: new DrizzleGroupInviteRepository(db),
  bookClubRepository: new DrizzleBookClubRepository(db),
  bookPollRepository: new DrizzleBookPollRepository(db),
  clubProgressQuery: new ClubProgressQuery(db),
}).listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});

const shutdown = async () => {
  console.log('Shutting down server and closing database pool...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
