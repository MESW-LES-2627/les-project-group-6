import type { Clock } from '../../utils/clock.js';
import { NotFoundError } from '../../utils/errors.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import {
  ChallengeGroup,
  ChallengePeriod,
  GroupId,
  GroupName,
  WinMetric,
} from './challenge-group.js';
import type { IChallengeGroupRepository } from './challenge-group-repository.js';

export interface CreateChallengeGroupCommand {
  userId: unknown;
  name: unknown;
  description?: unknown;
  startDate: unknown;
  durationDays: unknown;
  winMetric: unknown;
  metricGoal?: unknown;
}

// Application service: one method per use case on challenge groups.
export class ChallengeGroupService {
  constructor(
    private readonly groups: IChallengeGroupRepository,
    private readonly users: IUserRepository,
    readonly now: Clock = () => new Date(),
  ) {}

  /** The reader creates a challenge group and becomes its admin and first member. */
  async create(command: CreateChallengeGroupCommand): Promise<ChallengeGroup> {
    const adminId = UserId.of(command.userId);
    if (!(await this.users.findById(adminId))) throw new NotFoundError('User');

    const group = ChallengeGroup.create(
      {
        adminId,
        name: GroupName.of(command.name),
        description: typeof command.description === 'string' ? command.description : null,
        period: ChallengePeriod.lasting(command.startDate, command.durationDays),
        winMetric: WinMetric.of(command.winMetric),
        metricGoal: command.metricGoal === undefined ? 0 : (command.metricGoal as number),
      },
      this.now(),
    );

    await this.groups.add(group);
    return group;
  }

  async get(id: unknown): Promise<ChallengeGroup> {
    const group = await this.groups.findById(GroupId.of(id));
    if (!group) throw new NotFoundError('Challenge group');
    return group;
  }

  forMember(userId: unknown): Promise<ChallengeGroup[]> {
    return this.groups.findByMember(UserId.of(userId));
  }
}
