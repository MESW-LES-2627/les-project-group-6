import type { MemberJoined, MemberJoinedListener } from '../group/group.js';
import type { IUserRepository } from '../user/user-repository.js';
import type { SystemMessages } from './chat-service.js';

// Observer: posts "X joined the group" in the chat when an invite is accepted
// (F-GRP-02 rule 5), so the invite feature does not depend on the chat.
export class JoinAnnouncer implements MemberJoinedListener {
  constructor(
    private readonly chat: SystemMessages,
    private readonly users: IUserRepository,
  ) {}

  async memberJoined(event: MemberJoined): Promise<void> {
    const user = await this.users.findById(event.userId);
    await this.chat.postSystem(
      event.groupId,
      `${user?.displayName ?? 'A new reader'} joined the group`,
    );
  }
}
