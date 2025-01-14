import { ChannelMessage, DirectMessage } from '../models/message';
import { UserStatus } from '../models/user';
import { Reaction } from '../models/message';

/**
 * Socket event names
 */
export enum SocketEventName {
  NewMessage = 'new-message',
  NewDirectMessage = 'new-dm-message',
  UserPresenceChanged = 'user-presence-changed',
  ReactionAdded = 'reaction-added',
  ThreadReply = 'thread-reply',
  JoinChannel = 'join-channel',
  LeaveChannel = 'leave-channel',
  JoinConversation = 'join-conversation',
  LeaveConversation = 'leave-conversation'
}

/**
 * User presence change event payload
 */
export interface UserPresenceEvent {
  userId: string;
  status: UserStatus;
}

/**
 * Reaction event payload
 */
export interface ReactionEvent {
  messageId: number;
  reaction: Reaction | { removed: true; id: number };
}

/**
 * Thread reply event payload
 */
export interface ThreadReplyEvent {
  messageId: number;
  reply: ChannelMessage;
}

/**
 * Socket event map type mapping event names to their payload types
 */
export interface SocketEventMap {
  [SocketEventName.NewMessage]: ChannelMessage;
  [SocketEventName.NewDirectMessage]: DirectMessage;
  [SocketEventName.UserPresenceChanged]: UserPresenceEvent;
  [SocketEventName.ReactionAdded]: ReactionEvent;
  [SocketEventName.ThreadReply]: ThreadReplyEvent;
  [SocketEventName.JoinChannel]: number;
  [SocketEventName.LeaveChannel]: number;
  [SocketEventName.JoinConversation]: string;
  [SocketEventName.LeaveConversation]: string;
}

/**
 * Socket event handler type
 */
export type SocketEventHandler<T extends SocketEventName> = (
  payload: SocketEventMap[T]
) => void; 