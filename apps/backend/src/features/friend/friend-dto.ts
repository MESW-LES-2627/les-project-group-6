import type { Friendship, FriendshipStatus } from './friend.js';

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
