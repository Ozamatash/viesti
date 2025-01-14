import { Document } from "langchain/document";

/**
 * Result from the intelligent search feature
 */
export interface SearchResult {
  /** The AI-generated answer based on the search */
  answer: string;
  /** The source messages that were used to generate the answer */
  sources: Document[];
}

/**
 * Result from the channel recap feature
 */
export interface RecapResult {
  /** The generated summary of channel messages */
  summary: string;
  /** The timeframe of the recap (day/week/month) */
  timeframe: "day" | "week" | "month";
  /** Number of messages included in the recap */
  messageCount: number;
  /** Timestamp when the recap was generated */
  generatedAt: Date;
}

/**
 * Result from the thread summary feature
 */
export interface ThreadSummary {
  /** The generated summary of the thread */
  summary: string;
  /** Number of messages in the thread */
  messageCount: number;
  /** Key points extracted from the thread */
  keyPoints: string[];
  /** Action items identified in the thread */
  actionItems: string[];
  /** Timestamp when the summary was generated */
  generatedAt: Date;
}

/**
 * Configuration for AI features
 */
export interface AIConfig {
  /** Model to use for embeddings */
  embeddingModel: string;
  /** Model to use for text generation */
  llmModel: string;
  /** Chunk size for text splitting */
  chunkSize: number;
  /** Chunk overlap for text splitting */
  chunkOverlap: number;
}

/**
 * Metadata stored with each document in the vector store
 */
export interface MessageMetadata {
  messageId: string;
  channelId?: string;
  conversationId?: string;
  userId?: string;
  senderId?: string;
  receiverId?: string;
  timestamp: string;
  threadId?: string | null;
  type: "message" | "thread_reply" | "direct_message";
} 