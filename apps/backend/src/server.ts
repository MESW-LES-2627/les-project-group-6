import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { DatabaseHealthCheck } from './database/health-check.js';
import { createPool, createDb } from './database/pool.js';
import { DrizzleBookRepository } from './features/book/book-repository.js';
import { DrizzleChallengeGroupRepository } from './features/challenge-group/challenge-group-repository.js';
import { StandingsQuery } from './features/challenge-group/standings-query.js';
import { DrizzleChatMessageRepository } from './features/group-chat/chat-message-repository.js';
import { registerChatSocket, SocketIoChatNotifier } from './features/group-chat/chat-socket.js';
import { DrizzleGroupMembership } from './features/group-chat/group-membership-query.js';
import { DrizzleUserRepository } from './features/user/user-repository.js';
import { DrizzleLibraryQuery } from './features/library/library-query.js';
import { DrizzleReadingSessionRepository } from './features/reading-session/reading-session-repository.js';
import { DrizzleReadingStatusRepository } from './features/reading-status/reading-status-repository.js';

const pool = createPool();
const db = createDb(pool);

// Socket.IO only pushes chat events (ADR-0006); it shares the HTTP server's port.
const io = new SocketServer({ cors: { origin: '*' } });

const server = createApp({
  healthCheck: new DatabaseHealthCheck(pool),
  bookRepository: new DrizzleBookRepository(db),
  readingStatusRepository: new DrizzleReadingStatusRepository(db),
  libraryQuery: new DrizzleLibraryQuery(db),
  readingSessionRepository: new DrizzleReadingSessionRepository(db),
  userRepository: new DrizzleUserRepository(db),
  challengeGroupRepository: new DrizzleChallengeGroupRepository(db),
  standingsQuery: new StandingsQuery(db),
  chatMessageRepository: new DrizzleChatMessageRepository(db),
  groupMembership: new DrizzleGroupMembership(db),
  chatNotifier: new SocketIoChatNotifier(io),
  onChatService: (chat) =>
    registerChatSocket(io, (groupId, userId) => chat.canListen(groupId, userId)),
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
