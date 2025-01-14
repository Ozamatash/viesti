/**
 * Channel requests
 */
export interface CreateChannelRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
  members?: string[]; // User IDs
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * Message requests
 */
export interface SendMessageRequest {
  content: string;
  files?: {
    url: string;
    filename: string;
    filetype: string;
  }[];
}

export interface SendThreadReplyRequest extends SendMessageRequest {
  parentMessageId: string;
}

export interface UpdateMessageRequest {
  content: string;
}

export interface MessageSearchParams {
  query: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Reaction requests
 */
export interface AddReactionRequest {
  emoji: string;
}

/**
 * User requests
 */
export interface UpdateUserRequest {
  username?: string;
  profileImageUrl?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  statusMessage?: string;
}

/**
 * File requests
 */
export interface FileUploadRequest {
  file: File;
  type: 'message' | 'profile';
}

/**
 * Conversation requests
 */
export interface CreateConversationRequest {
  userId: string; // ID of user to start conversation with
  initialMessage?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Recap requests
 */
export interface RecapRequest {
  /** Type of content to generate recap for */
  type: "channel" | "thread" | "direct";
  /** ID of the content (channelId/threadId/conversationId) */
  id: string;
  /** Start time for the recap range */
  startTime?: string;
  /** End time for the recap range */
  endTime?: string;
  /** Maximum number of messages to include */
  maxMessages?: number;
  /** Whether to include thread messages in channel recaps */
  includeThreads?: boolean;
  /** Whether to include key topics in the recap */
  includeTopics?: boolean;
  /** Whether to include participant stats in the recap */
  includeParticipants?: boolean;
} 