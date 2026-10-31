import type {
  ChallengeGroup,
  ChallengeStatus,
  MemberRole,
  WinMetricType,
} from './challenge-group.js';
import type { StandingView } from './standings-query.js';

// Shape of a challenge group on the wire. Keeps value objects out of the JSON contract.
export interface ChallengeGroupDto {
  id: string;
  name: string;
  description: string;
  adminId: string;
  status: ChallengeStatus;
  challenge: {
    startDate: string;
    endDate: string;
    winMetric: WinMetricType;
    metricGoal: number;
  };
  members: { userId: string; role: MemberRole; joinedAt: string }[];
  createdAt: string;
}

export interface ChallengeGroupDetailDto extends ChallengeGroupDto {
  standings: StandingView[];
}

export function toChallengeGroupDto(
  group: ChallengeGroup,
  status: ChallengeStatus,
): ChallengeGroupDto {
  return {
    id: group.id.value,
    name: group.name.value,
    description: group.description,
    adminId: group.adminId.value,
    status,
    challenge: {
      startDate: group.challenge.period.startDate,
      endDate: group.challenge.period.endDate,
      winMetric: group.challenge.winMetric.value,
      metricGoal: group.challenge.metricGoal.value,
    },
    members: group.members.map((m) => ({
      userId: m.userId.value,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdAt: group.createdAt.toISOString(),
  };
}
