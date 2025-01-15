export interface SearchQueryParams {
  q: string;
  mode: "semantic" | "keyword";
  channelId?: string;
  conversationId?: string;
}

export interface SearchOptions {
  channelId?: number;
  conversationId?: string;
  userId: string;
} 