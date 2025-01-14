import { User } from './user';

/**
 * Channel type representing a chat channel
 */
export interface Channel {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count?: {
    members: number;
  };
}

/**
 * Channel membership type representing a user's membership in a channel
 */
export interface ChannelMembership {
  userId: string;
  channelId: number;
  joinedAt: string;
  user: User;
} 