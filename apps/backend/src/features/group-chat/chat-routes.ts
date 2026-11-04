import { Router } from 'express';
import { toChatMessageDto } from './chat-dto.js';
import type { ChatService } from './chat-service.js';

// userId comes from the query/body until Supabase Auth lands; then it comes from the token.
export function chatRoutes(chat: ChatService): Router {
  const router = Router();

  router.get('/groups/:id/messages', async (req, res) => {
    const entries = await chat.history(req.params.id, req.query.userId);
    res.status(200).json(entries.map(toChatMessageDto));
  });

  router.post('/groups/:id/messages', async (req, res) => {
    const { userId, text } = req.body;
    res.status(201).json(toChatMessageDto(await chat.post(req.params.id, userId, text)));
  });

  return router;
}
