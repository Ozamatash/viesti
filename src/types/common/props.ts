import { SendMessageRequest } from '../api/requests';
import { Thread } from '../models/message';

/**
 * Common props for message-related components and hooks
 */
export interface MessageContextProps {
  channelId?: number;
  conversationId?: string;
  searchTerm?: string;
}

export interface MessageListProps extends Omit<MessageContextProps, 'searchTerm'> {
  messageId?: number;  // For thread messages
  isThread?: boolean;
}

/**
 * Props for message hover actions component
 */
export interface MessageHoverActionsProps {
  messageId: number;
  onAddReaction: (emoji: string) => void;
  onThreadClick?: () => void;
  replyCount?: number;
}

/**
 * Props for emoji picker events
 */
export interface EmojiPickerEvent {
  native: string;
  [key: string]: any;
}

/**
 * Props for thread panel component
 */
export interface ThreadPanelProps {
  messageId: number;
  isOpen: boolean;
  onClose: () => void;
}

export interface ThreadState {
  thread: Thread | null;
  isLoading: boolean;
  error: string | null;
}

export interface ThreadHandlers {
  addReply: (content: string) => Promise<void>;
  handleSendReply: (request: SendMessageRequest) => Promise<void>;
}

export interface ThreadError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export type ThreadHookResult = ThreadState & ThreadHandlers;

/**
 * Props for user list component
 */
export interface UserListProps {
  /** Display variant for the user list */
  variant?: "sheet" | "workspace" | "workspace-button";
}

/**
 * Props and types for MessageInput component
 */
export interface MessageInputProps extends Pick<MessageContextProps, 'channelId' | 'conversationId'> {
  onMessageSent?: () => void;
  onSend?: (request: SendMessageRequest) => Promise<void>;
  isThread?: boolean;
}

export interface MessageInputState {
  content: string;
  files: File[];
  isUploading: boolean;
  isSending: boolean;
  isInputDisabled: boolean;
  isSubmitDisabled: boolean;
}

export interface MessageInputHandlers {
  setContent: (content: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  openFileInput: () => void;
}

export interface MessageInputRefs {
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export type MessageInputHookResult = MessageInputState & MessageInputHandlers & MessageInputRefs;

/**
 * Extended types for MessageList component
 */
export interface MessageListScrollRef extends HTMLDivElement {
  _prevMessagesLength: number;
}

export interface MessageSearchResult {
  id: number;
  content: string;
  createdAt: string;
  user: {
    username: string;
    profileImageUrl: string | null;
  };
}

export interface MessageEventHandlers {
  onReactionAdd: (messageId: number, emoji: string) => Promise<void>;
  onThreadOpen: (messageId: number) => void;
  onSearchSelect: (messageId: number) => void;
  onSearchClear: () => void;
}

export interface MessageSearchState {
  isSearching: boolean;
  searchTerm: string;
  searchResults: MessageSearchResult[];
  handleSearch: (term: string) => void;
}

export interface MessageScrollHandlers {
  scrollToMessage: (messageId: number) => void;
  scrollToBottom: () => void;
  isNearBottom: (threshold?: number) => boolean;
} 