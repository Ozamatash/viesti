import { Channel, ChannelMembership } from '../../models/channel';
import { ChannelMessage, DirectMessage, Thread } from '../../models/message';
import { User } from '../../models/user';
import { ApiResponse, PaginatedResponse } from '../core';

/**
 * Channel responses
 */
export type GetChannelsResponse = ApiResponse<Channel[]>;
export type GetChannelResponse = ApiResponse<Channel & { members: ChannelMembership[] }>;
export type GetChannelMembersResponse = ApiResponse<ChannelMembership[]>;
export type CreateChannelResponse = ApiResponse<Channel>;
export type UpdateChannelResponse = ApiResponse<Channel>;
export type DeleteChannelResponse = ApiResponse<{ success: true }>;
export type JoinChannelResponse = ApiResponse<ChannelMembership>;
export type LeaveChannelResponse = ApiResponse<{ success: true }>;

/**
 * Message responses
 */
export type GetChannelMessagesResponse = ApiResponse<PaginatedResponse<ChannelMessage>>;
export type GetDirectMessagesResponse = ApiResponse<PaginatedResponse<DirectMessage>>;
export type GetThreadResponse = ApiResponse<Thread>;
export type SendMessageResponse = ApiResponse<ChannelMessage | DirectMessage>;
export type DeleteMessageResponse = ApiResponse<{ success: true }>;
export type UpdateMessageResponse = ApiResponse<ChannelMessage | DirectMessage>;

/**
 * User responses
 */
export type GetUsersResponse = ApiResponse<PaginatedResponse<User>>;
export type GetUserResponse = ApiResponse<User>;
export type UpdateUserResponse = ApiResponse<User>;

/**
 * Reaction responses
 */
export type AddReactionResponse = ApiResponse<{
  id: number;
  emoji: string;
  user: {
    id: string;
    username: string;
  };
}>;
export type RemoveReactionResponse = ApiResponse<{ success: true }>;

/**
 * File responses
 */
export interface FileUploadResponse extends ApiResponse<{
  url: string;
  filename: string;
  filetype: string;
}> {}

/**
 * Conversation responses
 */
export interface GetConversationResponse extends ApiResponse<{
  conversationId: string;
  messages: DirectMessage[];
  otherUser: User;
}> {}

/**
 * Recap responses
 */
export interface RecapResponse extends ApiResponse<{
  /** Generated summary of the content */
  summary: string;
  /** Number of messages included in the recap */
  messageCount: number;
  /** Time range of the recap */
  timeRange: {
    start: string;
    end: string;
  };
  /** Key topics discussed (if requested) */
  topics?: string[];
  /** Participant statistics (if requested) */
  participants?: {
    total: number;
    active: number;
    topContributors: {
      userId: string;
      username: string;
      messageCount: number;
    }[];
  };
  /** Thread statistics (for channel recaps) */
  threads?: {
    total: number;
    active: number;
    resolved: number;
  };
  /** Timestamp when the recap was generated */
  generatedAt: string;
}> {} 