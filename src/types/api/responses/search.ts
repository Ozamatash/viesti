import { ApiResponse } from "./common";

export interface SearchResult {
  id: number;
  content: string;
  createdAt: string;
  relevanceScore?: number;
  user: {
    id: string;
    username: string;
    profileImageUrl: string | null;
  };
  channel?: {
    id: number;
    name: string;
  };
  thread?: {
    id: number;
    messageCount: number;
  };
}

export interface SearchResponse extends ApiResponse {
  data: {
    answer: string | null;
    results: SearchResult[];
  };
} 