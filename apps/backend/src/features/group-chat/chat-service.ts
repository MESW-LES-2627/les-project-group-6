import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IGroupRosterRepository } from '../group/group-roster-repository.js';
import {
  GroupId,
  type GroupRoster,
  type MemberJoined,
  type MemberJoinedListener,
} from '../group/group.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import { ChatMessage, MessageText } from './chat-message.js';
import type { ChatEntry, IChatRepository } from './chat-repository.js';

/** How many messages the chat loads; older ones are not shown yet. */
export const CHAT_PAGE_SIZE = 100;

// Application service for the chat of any group (challenge or book club). Only
// members read and write it.
export class ChatService implements MemberJoinedListener {
  constructor(
    private readonly messages: IChatRepository,
    private readonly rosters: IGroupRosterRepository,
    private readonly users: IUserRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async history(groupId: unknown, userId: unknown): Promise<ChatEntry[]> {
    const roster = await this.roster(groupId);
    roster.requireMember(UserId.of(userId), 'read the chat');
    return this.messages.recent(roster.groupId, CHAT_PAGE_SIZE);
  }

  async post(groupId: unknown, userId: unknown, text: unknown): Promise<ChatEntry> {
    const roster = await this.roster(groupId);
    const authorId = UserId.of(userId);
    roster.requireMember(authorId, 'write in the chat');

    const message = ChatMessage.post(roster.groupId, authorId, MessageText.of(text), this.now());
    await this.messages.add(message);
    const author = await this.users.findById(authorId);
    return {
      message,
      author: author ? { displayName: author.displayName, username: author.username.value } : null,
    };
  }

  /** Posts a system message, for the other group features to announce events. */
  async announce(groupId: GroupId, text: string): Promise<void> {
    await this.messages.add(ChatMessage.system(groupId, text, this.now()));
  }

  async memberJoined(event: MemberJoined): Promise<void> {
    const user = await this.users.findById(event.userId);
    await this.announce(event.groupId, `${user?.displayName ?? 'A new reader'} joined the group.`);
  }

  private async roster(groupId: unknown): Promise<GroupRoster> {
    const roster = await this.rosters.findById(GroupId.of(groupId));
    if (!roster) throw new NotFoundError('Group');
    return roster;
  }
}
