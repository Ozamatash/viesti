import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { searchSimilarDocuments } from "./vector-store";
import { getAIEnvVars, defaultAIConfig } from "~/config/ai";
import { MessageMetadata } from "~/types";
import { db } from "~/server/db";

export interface MessageSearchResult {
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

export interface SearchResponse {
  answer: string | null;
  results: MessageSearchResult[];
}

export interface SearchOptions {
  channelId?: string;
  conversationId?: string;
  maxResults?: number;
  searchMode: "semantic" | "keyword";
  includeThreads?: boolean;
}

type MessageType = "message" | "thread_reply" | "direct_message";

/**
 * Perform semantic or keyword search across messages
 */
export async function searchMessages(
  query: string,
  options: SearchOptions
): Promise<SearchResponse> {
  const {
    channelId,
    conversationId,
    maxResults = 10,
    searchMode = "semantic",
    includeThreads = false
  } = options;

  console.log("[SEARCH] Searching messages:", { query, options });

  // Build filter based on context
  const filter: Record<string, any> = {
    // Always include type filter to ensure valid Pinecone query
    type: "message" as MessageType
  };
  
  if (channelId) {
    filter.channelId = channelId;
  } else if (conversationId) {
    filter.conversationId = conversationId;
    filter.type = "direct_message" as MessageType;
  }

  // Get messages from vector store
  const messages = await searchSimilarDocuments(query, {
    filter,
    k: Math.ceil(maxResults / (includeThreads ? 2 : 1)),
    searchType: "similarity"
  });

  console.log("[SEARCH] Found messages:", messages.length);

  // If including thread messages, get them separately
  let allMessages = messages;
  if (includeThreads && channelId) {
    const threadFilter = {
      channelId,
      type: "thread_reply" as MessageType
    };
    const threadMessages = await searchSimilarDocuments(query, {
      filter: threadFilter,
      k: Math.ceil(maxResults / 2),
      searchType: "similarity"
    });
    console.log("[SEARCH] Found thread messages:", threadMessages.length);
    allMessages = [...messages, ...threadMessages]
      .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0))
      .slice(0, maxResults);
  } else {
    // For non-semantic search, just sort by similarity score and limit results
    allMessages = allMessages
      .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0))
      .slice(0, maxResults);
  }

  // Get message IDs from vector store results
  const messageIds = allMessages.map(msg => 
    parseInt(msg.metadata?.messageId || "0", 10)
  ).filter(id => id > 0);

  // Fetch complete message data from database
  const dbMessages = await db.message.findMany({
    where: {
      id: {
        in: messageIds
      }
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profileImageUrl: true
        }
      },
      channel: {
        select: {
          id: true,
          name: true
        }
      },
      replies: {
        select: {
          id: true
        }
      }
    }
  });

  // Create a map for quick message lookup
  const messageMap = new Map(
    dbMessages.map(msg => [msg.id, msg])
  );

  // Combine vector store results with database data
  const results = allMessages.map((msg) => {
    const messageId = parseInt(msg.metadata?.messageId || "0", 10);
    const dbMessage = messageMap.get(messageId);

    if (!dbMessage) {
      console.warn(`Message ${messageId} not found in database`);
      return null;
    }

    const result: MessageSearchResult = {
      id: messageId,
      content: msg.pageContent,
      createdAt: dbMessage.createdAt.toISOString(),
      relevanceScore: msg.metadata?.score,
      user: {
        id: dbMessage.user.id,
        username: dbMessage.user.username,
        profileImageUrl: dbMessage.user.profileImageUrl
      }
    };

    if (dbMessage.channel) {
      result.channel = {
        id: dbMessage.channel.id,
        name: dbMessage.channel.name
      };
    }

    if (dbMessage.replies.length > 0) {
      result.thread = {
        id: dbMessage.id,
        messageCount: dbMessage.replies.length
      };
    }

    return result;
  }).filter((result): result is MessageSearchResult => result !== null);

  // Generate AI answer for semantic search
  let answer: string | null = null;
  if (searchMode === "semantic" && results.length > 0) {
    const { openAIApiKey } = getAIEnvVars();
    const llm = new ChatOpenAI({
      openAIApiKey,
      modelName: defaultAIConfig.llmModel,
      temperature: 0.7 // Slightly higher for more natural responses
    });

    // Format messages for context
    const messagesContext = results
      .map(msg => {
        const timestamp = new Date(msg.createdAt);
        const timeAgo = getRelativeTimeString(timestamp);
        return `${msg.user.username} (${timeAgo}): ${msg.content}`;
      })
      .join("\n");

    // Create prompt for answer generation
    const answerPrompt = `Based on these chat messages, answer the following question naturally and conversationally.
Be concise but informative. If you're not sure, just say so.
IMPORTANT: When referring to times or dates mentioned in messages, always convert them to relative time from now (e.g., "The meeting was scheduled 3 days ago at 2pm" instead of just "at 2pm").

Chat Messages:
${messagesContext}

Current time: ${new Date().toLocaleString()}
Question: ${query}

Answer:`;

    try {
      const response = await llm.invoke(answerPrompt);
      answer = response.content.toString().trim();
    } catch (error) {
      console.error("[SEARCH] Failed to generate answer:", error);
      answer = null;
    }
  }

  return {
    answer,
    results
  };
}

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diffInSeconds < minute) {
    return "just now";
  } else if (diffInSeconds < hour) {
    const minutes = Math.floor(diffInSeconds / minute);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < day) {
    const hours = Math.floor(diffInSeconds / hour);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
} 