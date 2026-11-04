import type { GroupKind } from '../group/group.js';
import type { GroupInvite, InviteStatus } from './group-invite.js';
import type { PendingInvite } from './group-invite-repository.js';

export interface GroupInviteDto {
  id: string;
  groupId: string;
  inviteeId: string;
  inviterId: string;
  status: InviteStatus;
  createdAt: string;
}

export interface PendingInviteDto extends GroupInviteDto {
  groupName: string;
  groupKind: GroupKind;
  inviterName: string;
}

export function toGroupInviteDto(invite: GroupInvite): GroupInviteDto {
  return {
    id: invite.id.value,
    groupId: invite.groupId.value,
    inviteeId: invite.inviteeId.value,
    inviterId: invite.inviterId.value,
    status: invite.status,
    createdAt: invite.createdAt.toISOString(),
  };
}

export function toPendingInviteDto(pending: PendingInvite): PendingInviteDto {
  return {
    ...toGroupInviteDto(pending.invite),
    groupName: pending.groupName,
    groupKind: pending.groupKind,
    inviterName: pending.inviterName,
  };
}
