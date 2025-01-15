import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { searchSimilarDocuments } from "./vector-store";
import { getAIEnvVars, defaultAIConfig } from "~/config/ai";
import { MessageMetadata, MessageSearchResult } from "~/types";

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
): Promise<MessageSearchResult[]> {
  const {
    channelId,
    conversationId,
    maxResults = 20,
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
    k: maxResults,
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
      k: maxResults,
      searchType: "similarity"
    });
    console.log("[SEARCH] Found thread messages:", threadMessages.length);
    allMessages = [...messages, ...threadMessages];
  }

  // If using semantic search, rerank results using LLM
  if (searchMode === "semantic") {
    const { openAIApiKey } = getAIEnvVars();
    const llm = new ChatOpenAI({
      openAIApiKey,
      modelName: defaultAIConfig.llmModel,
      temperature: 0
    });

    // Create prompt for relevance scoring
    const scoringPrompt = `Rate how relevant each message is to the following query on a scale of 0-100.
Focus on semantic meaning and context, not just keyword matches.
Provide just the numeric score, nothing else.

Query: ${query}

Message: {message}

Relevance Score (0-100):`;

    // Score each message for relevance
    const scoredMessages = await Promise.all(
      allMessages.map(async (msg) => {
        const prompt = scoringPrompt.replace("{message}", msg.pageContent);
        const response = await llm.invoke(prompt);
        const score = parseInt(response.content.toString().trim(), 10);
        return {
          message: msg,
          score: isNaN(score) ? 0 : score
        };
      })
    );

    // Sort by relevance score
    allMessages = scoredMessages
      .sort((a, b) => b.score - a.score)
      .map(({ message }) => message);
  }

  // Convert to MessageSearchResult format
  return allMessages.map((msg) => ({
    id: parseInt(msg.metadata?.messageId || "0", 10),
    content: msg.pageContent,
    createdAt: msg.metadata?.timestamp || new Date().toISOString(),
    relevanceScore: msg.metadata?.score,
    user: {
      id: msg.metadata?.userId || "",
      username: msg.metadata?.username || "Unknown",
      profileImageUrl: msg.metadata?.userProfileImage || null
    },
    ...(msg.metadata?.channelId && {
      channel: {
        id: parseInt(msg.metadata.channelId, 10),
        name: msg.metadata.channelName || "Unknown"
      }
    }),
    ...(msg.metadata?.threadId && {
      thread: {
        id: parseInt(msg.metadata.threadId, 10),
        messageCount: msg.metadata.threadMessageCount || 0
      }
    })
  }));
} 