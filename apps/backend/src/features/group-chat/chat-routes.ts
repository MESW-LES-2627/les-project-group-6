import { Router } from 'express';
import type { ChatService } from './chat-service.js';
import { toChatMessageDto } from './chat-dto.js';

// REST is the source of truth for the chat (ADR-0006); the socket only pushes.
// userId comes from the body/query until Supabase Auth lands; then it comes from the token.
export function chatRoutes(chat: ChatService): Router {
  const router = Router();

  router.post('/groups/:groupId/messages', async (req, res) => {
    const { userId, clientId, body } = req.body ?? {};
    const { message, created } = await chat.send({
      groupId: req.params.groupId,
      userId,
      clientId,
      body,
    });
    res.status(created ? 201 : 200).json(toChatMessageDto(message));
  });

  router.get('/groups/:groupId/messages', async (req, res) => {
    const { userId, after, before, limit } = req.query;
    const messages = await chat.history({
      groupId: req.params.groupId,
      userId,
      after,
      before,
      limit,
    });
    res.status(200).json(messages.map(toChatMessageDto));
  });

  router.delete('/groups/:groupId/messages/:messageId', async (req, res) => {
    await chat.delete({
      groupId: req.params.groupId,
      messageId: req.params.messageId,
      userId: req.body?.userId,
    });
    res.status(204).end();
  });

  return router;
}
