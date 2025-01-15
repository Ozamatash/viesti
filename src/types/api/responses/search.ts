import { ApiResponse } from "./common";

export interface SearchResult {
  id: number;
  content: string;
  createdAt: string;
  relevanceScore?: number;
  user: {
    username: string;
    profileImageUrl: string | null;
  };
  channel?: {
    name: string;
  };
  thread?: {
    id: number;
    messageCount: number;
  };
}

export interface SearchResponse extends ApiResponse {
  data: {
    results: SearchResult[];
  };
} 