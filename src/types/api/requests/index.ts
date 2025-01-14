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