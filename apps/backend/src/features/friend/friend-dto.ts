import type { Friendship, FriendshipStatus } from './friend.js';
import type { IncomingRequest } from './friend-service.js';

export interface FriendshipDto {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  respondedAt: string | null;
}

export function toFriendshipDto(friendship: Friendship): FriendshipDto {
  return {
    id: friendship.id.value,
    requesterId: friendship.requesterId.value,
    addresseeId: friendship.addresseeId.value,
    status: friendship.status,
    createdAt: friendship.createdAt.toISOString(),
    respondedAt: friendship.respondedAt ? friendship.respondedAt.toISOString() : null,
  };
}

/** An incoming request as Home and the profile page show it: who is asking. */
export interface IncomingRequestDto extends FriendshipDto {
  requester: { displayName: string; username: string } | null;
}

export function toIncomingRequestDto({
  friendship,
  requester,
}: IncomingRequest): IncomingRequestDto {
  return {
    ...toFriendshipDto(friendship),
    requester: requester
      ? { displayName: requester.displayName, username: requester.username.value }
      : null,
  };
}
