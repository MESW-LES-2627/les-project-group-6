import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { DatabaseHealthCheck } from './database/health-check.js';
import { createPool, createDb } from './database/pool.js';
import { SupabaseAuthProvider } from './features/auth/supabase-auth-provider.js';
import { DrizzleBookRepository } from './features/book/book-repository.js';
import { DrizzleChallengeGroupRepository } from './features/challenge-group/challenge-group-repository.js';
import { StandingsQuery } from './features/challenge-group/standings-query.js';
import { DrizzleChatMessageRepository } from './features/group-chat/chat-message-repository.js';
import { registerChatSocket, SocketIoChatNotifier } from './features/group-chat/chat-socket.js';
import { DrizzleGroupMembership } from './features/group-chat/group-membership-query.js';
import { DrizzleUserRepository } from './features/user/user-repository.js';
import { DrizzleBookClubRepository } from './features/book-club/book-club-repository.js';
import { DrizzleBookPollRepository } from './features/book-club/book-poll-repository.js';
import { ClubProgressQuery } from './features/book-club/club-progress-query.js';
import { DrizzleFriendRepository } from './features/friend/friend-repository.js';
import { DrizzleGroupInviteRepository } from './features/group-invite/group-invite-repository.js';
import { DrizzleGroupRosterRepository } from './features/group/group-roster-repository.js';
import { DrizzleLibraryQuery } from './features/library/library-query.js';
import { DrizzleReadingActivityQuery } from './features/reading-session/reading-activity-query.js';
import { DrizzleReadingSessionRepository } from './features/reading-session/reading-session-repository.js';
import { DrizzleReadingProgressQuery } from './features/reading-status/reading-progress-query.js';
import { DrizzleReadingStatusRepository } from './features/reading-status/reading-status-repository.js';

if (!env.supabaseUrl) {
  throw new Error('SUPABASE_URL is not set; the API cannot verify sessions (see .env.example).');
}
const authProvider = new SupabaseAuthProvider({
  url: env.supabaseUrl,
  jwtSecret: env.supabaseJwtSecret || undefined,
});

const pool = createPool();
const db = createDb(pool);

// Socket.IO only pushes chat events (ADR-0006); it shares the HTTP server's port.
const io = new SocketServer({
  cors: { origin: env.corsOrigins.length > 0 ? env.corsOrigins : '*' },
});

const server = createApp({
  trustProxy: env.trustProxy,
  corsOrigins: env.corsOrigins,
  authProvider,
  healthCheck: new DatabaseHealthCheck(pool),
  bookRepository: new DrizzleBookRepository(db),
  readingStatusRepository: new DrizzleReadingStatusRepository(db),
  libraryQuery: new DrizzleLibraryQuery(db),
  readingSessionRepository: new DrizzleReadingSessionRepository(db),
  readingActivityQuery: new DrizzleReadingActivityQuery(db),
  readingProgressQuery: new DrizzleReadingProgressQuery(db),
  userRepository: new DrizzleUserRepository(db),
  challengeGroupRepository: new DrizzleChallengeGroupRepository(db),
  standingsQuery: new StandingsQuery(db),
  groupRosterRepository: new DrizzleGroupRosterRepository(db),
  friendRepository: new DrizzleFriendRepository(db),
  groupInviteRepository: new DrizzleGroupInviteRepository(db),
  bookClubRepository: new DrizzleBookClubRepository(db),
  bookPollRepository: new DrizzleBookPollRepository(db),
  clubProgressQuery: new ClubProgressQuery(db),
  chatMessageRepository: new DrizzleChatMessageRepository(db),
  groupMembership: new DrizzleGroupMembership(db),
  chatNotifier: new SocketIoChatNotifier(io),
  onChatService: (chat) =>
    registerChatSocket(io, authProvider, (groupId, userId) => chat.canListen(groupId, userId)),
}).listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});

io.attach(server);

const shutdown = async () => {
  console.log('Shutting down server and closing database pool...');
  // Closing Socket.IO also closes the HTTP server it is attached to.
  void io.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
