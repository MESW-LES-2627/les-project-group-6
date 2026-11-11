import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import { GroupId, GroupName } from '../group/group.js';
import {
  ChallengeGroup,
  ChallengePeriod,
  MetricGoal,
  WinMetric,
  type ChallengeStatus,
} from './challenge-group.js';
import type { IChallengeGroupRepository } from './challenge-group-repository.js';
import type { SystemMessages } from '../group-chat/chat-service.js';

export interface CreateChallengeGroupCommand {
  userId: unknown;
  name: unknown;
  description?: unknown;
  startDate: unknown;
  durationDays: unknown;
  winMetric: unknown;
  metricGoal?: unknown;
}

/** A group with its status at the moment it was read. */
export interface ChallengeGroupView {
  group: ChallengeGroup;
  status: ChallengeStatus;
}

// Application service: one method per use case on challenge groups.
export class ChallengeGroupService {
  constructor(
    private readonly groups: IChallengeGroupRepository,
    private readonly users: IUserRepository,
    private readonly now: Clock = () => new Date(),
    /** Posts the group's system messages in its chat (F-GRP-02 rule 5), when wired. */
    private readonly chat?: SystemMessages,
  ) {}

  /** The reader creates a challenge group and becomes its admin and first member. */
  async create(command: CreateChallengeGroupCommand): Promise<ChallengeGroupView> {
    const adminId = UserId.of(command.userId);
    const admin = await this.users.findById(adminId);
    if (!admin) throw new NotFoundError('User');

    const group = ChallengeGroup.create(
      {
        adminId,
        name: GroupName.of(command.name),
        description: typeof command.description === 'string' ? command.description : null,
        period: ChallengePeriod.lasting(command.startDate, command.durationDays),
        winMetric: WinMetric.of(command.winMetric),
        metricGoal:
          command.metricGoal === undefined ? MetricGoal.none() : MetricGoal.of(command.metricGoal),
      },
      this.now(),
    );

    await this.groups.add(group);
    await this.chat?.postSystem(group.id, `${admin.displayName} created the challenge`);
    return this.view(group);
  }

  /** The group as seen by one of its members; anyone else gets 404, as if it did not exist. */
  async get(id: unknown, readerId: unknown): Promise<ChallengeGroupView> {
    const group = await this.groups.findById(GroupId.of(id));
    if (!group || !group.isMember(UserId.of(readerId))) {
      throw new NotFoundError('Challenge group');
    }
    return this.view(group);
  }

  async forMember(userId: unknown): Promise<ChallengeGroupView[]> {
    const groups = await this.groups.findByMember(UserId.of(userId));
    return groups.map((group) => this.view(group));
  }

  private view(group: ChallengeGroup): ChallengeGroupView {
    return { group, status: group.statusAt(this.now()) };
  }
}
