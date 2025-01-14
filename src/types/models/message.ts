import { User, MinimalUser } from './user';

/**
 * File attachment type for messages
 */
export interface FileAttachment {
  id: number;
  url: string;
  filename: string;
  filetype: string;
}

/**
 * Reaction type for messages
 */
export interface Reaction {
  id: number;
  emoji: string;
  user: MinimalUser;
}

/**
 * Base message interface with common properties for both channel messages and DMs
 */
export interface BaseMessage {
  id: number;
  content: string;
  createdAt: string;
  user: User;
  files: FileAttachment[];
  reactions: Reaction[];
}

/**
 * Channel message type extending base message
 */
export interface ChannelMessage extends BaseMessage {
  channelId: number;
  parentMessageId?: number;
  _count?: {
    replies: number;
  };
}

/**
 * Direct message type extending base message
 */
export interface DirectMessage extends BaseMessage {
  senderId: string;
  receiverId: string;
  conversationId: string;
}

/**
 * Thread type for channel messages with replies
 */
export interface Thread extends ChannelMessage {
  replies: ChannelMessage[];
}

/**
 * Union type for all message types
 */
export type Message = ChannelMessage | DirectMessage;

/**
 * Type guard to check if a message is a channel message
 */
export function isChannelMessage(message: Message): message is ChannelMessage {
  return 'channelId' in message;
} 