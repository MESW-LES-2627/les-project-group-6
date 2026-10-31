import crypto from 'node:crypto';
import { InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { UserId } from '../user/user.js';

export class GroupId extends Uuid {
  declare private readonly brand: 'GroupId';

  static of(raw: unknown): GroupId {
    return new GroupId(Uuid.parse(raw, 'group id'));
  }

  static generate(): GroupId {
    return new GroupId(crypto.randomUUID());
  }
}

export class InvalidGroupNameError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Group name must be 1-100 characters, got ${String(raw)}`);
  }
}

export class GroupName {
  private constructor(readonly value: string) {}

  static of(raw: unknown): GroupName {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length === 0 || name.length > 100) throw new InvalidGroupNameError(raw);
    return new GroupName(name);
  }
}

export const WIN_METRICS = ['minutes', 'pages', 'books', 'streak'] as const;
export type WinMetricType = (typeof WIN_METRICS)[number];

export class InvalidWinMetricError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Win metric must be one of ${WIN_METRICS.join(', ')}, got ${String(raw)}`);
  }
}

export class WinMetric {
  private constructor(readonly value: WinMetricType) {}

  static of(raw: unknown): WinMetric {
    if (!WIN_METRICS.includes(raw as WinMetricType)) throw new InvalidWinMetricError(raw);
    return new WinMetric(raw as WinMetricType);
  }
}

export class InvalidChallengePeriodError extends InvalidValueError {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_CHALLENGE_DAYS = 365;

function parseDay(raw: unknown, label: string): Date {
  const date = typeof raw === 'string' && ISO_DATE.test(raw) ? new Date(`${raw}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new InvalidChallengePeriodError(`Invalid ${label}: ${String(raw)}`);
  }
  return date;
}

export type ChallengeStatus = 'scheduled' | 'active' | 'completed';

// Value object: the inclusive calendar days a challenge runs, in UTC.
export class ChallengePeriod {
  private constructor(
    readonly startDate: string,
    readonly endDate: string,
  ) {}

  static of(start: unknown, end: unknown): ChallengePeriod {
    const from = parseDay(start, 'start date');
    const to = parseDay(end, 'end date');
    const days = (to.getTime() - from.getTime()) / DAY_MS + 1;
    if (days < 1) throw new InvalidChallengePeriodError('The end date is before the start date');
    if (days > MAX_CHALLENGE_DAYS) {
      throw new InvalidChallengePeriodError(`A challenge lasts at most ${MAX_CHALLENGE_DAYS} days`);
    }
    return new ChallengePeriod(start as string, end as string);
  }

  /** A period of `days` days starting on `start`, as the create form sends it. */
  static lasting(start: unknown, days: unknown): ChallengePeriod {
    const from = parseDay(start, 'start date');
    if (!Number.isInteger(days) || (days as number) < 1) {
      throw new InvalidChallengePeriodError(`Invalid duration: ${String(days)}`);
    }
    const end = new Date(from.getTime() + ((days as number) - 1) * DAY_MS);
    return ChallengePeriod.of(start, end.toISOString().slice(0, 10));
  }

  /** First instant after the last day, for half-open time ranges. */
  get endsAt(): Date {
    return new Date(new Date(`${this.endDate}T00:00:00Z`).getTime() + DAY_MS);
  }

  get startsAt(): Date {
    return new Date(`${this.startDate}T00:00:00Z`);
  }

  statusAt(now: Date): ChallengeStatus {
    if (now < this.startsAt) return 'scheduled';
    if (now >= this.endsAt) return 'completed';
    return 'active';
  }
}

export type MemberRole = 'admin' | 'member';

export interface Membership {
  userId: UserId;
  role: MemberRole;
  joinedAt: Date;
}

export interface Challenge {
  period: ChallengePeriod;
  winMetric: WinMetric;
  /** 0 means no target: whoever has the highest score wins. */
  metricGoal: number;
}

export interface NewChallengeGroupProps {
  adminId: UserId;
  name: GroupName;
  description?: string | null;
  period: ChallengePeriod;
  winMetric: WinMetric;
  metricGoal?: number;
}

export interface ChallengeGroupState {
  id: GroupId;
  name: GroupName;
  description: string;
  adminId: UserId;
  members: Membership[];
  challenge: Challenge;
  createdAt: Date;
}

// Aggregate root: a group whose members compete in one challenge. The creator
// is its admin and its first member.
export class ChallengeGroup {
  readonly id: GroupId;
  readonly name: GroupName;
  readonly description: string;
  readonly adminId: UserId;
  readonly challenge: Challenge;
  readonly createdAt: Date;
  private readonly _members: Membership[];

  private constructor(state: ChallengeGroupState) {
    this.id = state.id;
    this.name = state.name;
    this.description = state.description;
    this.adminId = state.adminId;
    this._members = [...state.members];
    this.challenge = state.challenge;
    this.createdAt = state.createdAt;
  }

  static create(props: NewChallengeGroupProps, now: Date = new Date()): ChallengeGroup {
    const goal = props.metricGoal ?? 0;
    if (!Number.isInteger(goal) || goal < 0) {
      throw new InvalidValueError(`Metric goal must be a whole number >= 0, got ${goal}`);
    }
    return new ChallengeGroup({
      id: GroupId.generate(),
      name: props.name,
      description: props.description?.trim() ?? '',
      adminId: props.adminId,
      members: [{ userId: props.adminId, role: 'admin', joinedAt: now }],
      challenge: { period: props.period, winMetric: props.winMetric, metricGoal: goal },
      createdAt: now,
    });
  }

  /** Rebuilds a group that already exists (used by the repository). */
  static reconstitute(state: ChallengeGroupState): ChallengeGroup {
    return new ChallengeGroup(state);
  }

  get members(): readonly Membership[] {
    return this._members;
  }

  isMember(userId: UserId): boolean {
    return this._members.some((m) => m.userId.equals(userId));
  }

  statusAt(now: Date): ChallengeStatus {
    return this.challenge.period.statusAt(now);
  }
}
