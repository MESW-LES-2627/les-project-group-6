import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { ChatService } from './chat-service.js';
import { toChatMessageDto } from './chat-dto.js';

// REST is the source of truth for the chat (ADR-0006); the socket only pushes.
// The author/reader is always the signed-in user (from the token).
export function chatRoutes(chat: ChatService): Router {
  const router = Router();

  router.post('/groups/:groupId/messages', async (req, res) => {
    const { clientId, body } = req.body ?? {};
    const { message, created } = await chat.send({
      groupId: req.params.groupId,
      userId: currentUserId(res),
      clientId,
      body,
    });
    res.status(created ? 201 : 200).json(toChatMessageDto(message));
  });

  router.get('/groups/:groupId/messages', async (req, res) => {
    const { after, before, limit } = req.query;
    const messages = await chat.history({
      groupId: req.params.groupId,
      userId: currentUserId(res),
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
      userId: currentUserId(res),
    });
    res.status(204).end();
  });

  return router;
}
