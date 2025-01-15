import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { searchSimilarDocuments } from "./vector-store";
import { getAIEnvVars, defaultAIConfig } from "~/config/ai";
import { MessageMetadata, RecapData } from "~/types";

export interface RecapOptions {
  startTime?: Date;
  endTime?: Date;
  maxMessages?: number;
  includeThreads?: boolean;
  includeTopics?: boolean;
  includeParticipants?: boolean;
}

export interface RecapResult extends Omit<RecapData, 'timeRange' | 'generatedAt'> {
  timeRange: {
    start: Date;
    end: Date;
  };
}

type MessageType = "message" | "thread_reply" | "direct_message";

/**
 * Generate a recap for channel messages
 */
export async function generateChannelRecap(
  channelId: string,
  options: RecapOptions = {}
): Promise<RecapResult> {
  console.log("[RECAP] Generating channel recap for:", channelId, options);
  
  const {
    startTime = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime = new Date(),
    maxMessages = 100,
    includeThreads = false,
    includeTopics = false,
    includeParticipants = false
  } = options;

  console.log("[RECAP] Time range:", { startTime, endTime });

  // Get messages from the channel
  const messages = await searchSimilarDocuments("", {
    filter: {
      channelId,
      type: "message" as MessageType
    },
    k: maxMessages,
    searchType: "similarity"
  });

  console.log("[RECAP] Found channel messages:", messages.length);

  // If we need thread messages too, get them separately and combine
  let allMessages = messages;
  if (includeThreads) {
    const threadMessages = await searchSimilarDocuments("", {
      filter: {
        channelId,
        type: "thread_reply" as MessageType
      },
      k: maxMessages,
      searchType: "similarity"
    });
    console.log("[RECAP] Found thread messages:", threadMessages.length);
    allMessages = [...messages, ...threadMessages];
  }

  console.log("[RECAP] Total messages before filtering:", allMessages.length);

  return await generateRecap(allMessages as Document<MessageMetadata>[], {
    startTime,
    endTime,
    includeTopics,
    includeParticipants,
    promptTemplate: `Provide a concise summary of this chat conversation.
Write a brief summary that captures the main points and context.
Focus on the content and information exchanged.
${includeTopics ? 'Include relevant topics discussed.' : ''}
${includeParticipants ? 'Note participant contributions where significant.' : ''}
Maintain a neutral, factual tone.

Here are the messages:
{messages}

Summary:`
  });
}

/**
 * Generate a recap for thread messages
 */
export async function generateThreadRecap(
  threadId: string,
  options: RecapOptions = {}
): Promise<RecapResult> {
  const {
    startTime = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime = new Date(),
    maxMessages = 100,
    includeTopics = false,
    includeParticipants = false
  } = options;

  // Get messages from the thread
  const messages = await searchSimilarDocuments("", {
    filter: {
      threadId,
      type: "thread_reply" as MessageType
    },
    k: maxMessages,
    searchType: "similarity"
  });

  return await generateRecap(messages as Document<MessageMetadata>[], {
    startTime,
    endTime,
    includeTopics,
    includeParticipants,
    promptTemplate: `Please provide a concise summary of this conversation thread.
Extract:
- Main topic/question
- Key points discussed
- Decisions made
- Action items (if any)
${includeTopics ? '\nExtract key topics discussed.' : ''}
${includeParticipants ? '\nHighlight active participants and their contributions.' : ''}

Thread:
{messages}

Summary:`
  });
}

/**
 * Generate a recap for direct messages
 */
export async function generateDirectMessageRecap(
  conversationId: string,
  options: RecapOptions = {}
): Promise<RecapResult> {
  const {
    startTime = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime = new Date(),
    maxMessages = 100,
    includeTopics = false,
    includeParticipants = false
  } = options;

  // Get messages from the conversation
  const messages = await searchSimilarDocuments("", {
    filter: {
      conversationId,
      type: "direct_message" as MessageType
    },
    k: maxMessages,
    searchType: "similarity"
  });

  return await generateRecap(messages as Document<MessageMetadata>[], {
    startTime,
    endTime,
    includeTopics,
    includeParticipants,
    promptTemplate: `Please provide a concise summary of this direct message conversation.
Focus on:
- Main topics of discussion
- Agreements or decisions made
- Action items or next steps
${includeTopics ? '\nExtract key topics discussed.' : ''}
${includeParticipants ? '\nHighlight participation and engagement.' : ''}

Conversation:
{messages}

Summary:`
  });
}

interface GenerateRecapOptions extends Required<Pick<RecapOptions, 'startTime' | 'endTime' | 'includeTopics' | 'includeParticipants'>> {
  promptTemplate: string;
}

/**
 * Core recap generation function used by all recap types
 */
async function generateRecap(
  messages: Document<MessageMetadata>[],
  options: GenerateRecapOptions
): Promise<RecapResult> {
  const { startTime, endTime, includeTopics, includeParticipants, promptTemplate } = options;

  console.log("[RECAP] Generating recap with messages:", messages.length);

  // Filter by timestamp
  const filteredMessages = messages.filter(msg => {
    const timestamp = msg.metadata?.timestamp;
    console.log("[RECAP] Message timestamp:", timestamp);
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        const isInRange = date >= startTime && date <= endTime;
        console.log("[RECAP] Is in range:", isInRange, { date, startTime, endTime });
        return isInRange;
      }
    }
    console.log("[RECAP] Message skipped - invalid timestamp");
    return false;
  });

  console.log("[RECAP] Messages after timestamp filtering:", filteredMessages.length);

  if (filteredMessages.length === 0) {
    console.log("[RECAP] No messages found in range");
    return {
      summary: "No messages found in the specified time range.",
      keyPoints: [],
      messageCount: 0,
      timeRange: {
        start: startTime,
        end: endTime
      }
    };
  }

  // Sort messages by timestamp
  const sortedMessages = filteredMessages.sort((a, b) => {
    const timeA = new Date(a.metadata?.timestamp || 0).getTime();
    const timeB = new Date(b.metadata?.timestamp || 0).getTime();
    return timeA - timeB;
  });

  // Generate summary using ChatGPT
  const { openAIApiKey } = getAIEnvVars();
  const llm = new ChatOpenAI({
    openAIApiKey,
    modelName: defaultAIConfig.llmModel,
    temperature: 0.7
  });

  const formattedMessages = sortedMessages.map(msg => 
    `[${msg.metadata?.timestamp}] ${msg.pageContent}`
  ).join('\n');

  const response = await llm.invoke(promptTemplate.replace('{messages}', formattedMessages));
  const summary = typeof response.content === 'string' ? response.content : response.content.join(' ');

  // Extract key points
  const keyPointsPrompt = `Extract the main points from this conversation.
Present them clearly and concisely (maximum 5 points).
Focus on factual content and key information.

${formattedMessages}

Key Points:`;
  const keyPointsResponse = await llm.invoke(keyPointsPrompt);
  const keyPointsContent = typeof keyPointsResponse.content === 'string' ? keyPointsResponse.content : keyPointsResponse.content.join('\n');
  const keyPoints = keyPointsContent
    .split('\n')
    .map(point => point.replace(/^[0-9-.\s]*/, '').trim())
    .filter(point => point.length > 0);

  // Extract topics if requested
  let topics: string[] | undefined;
  if (includeTopics) {
    const topicsPrompt = `Identify the main topics from this conversation.
List them concisely (maximum 5 topics).
Focus on substantive discussion points.

${formattedMessages}

Topics:`;
    const topicsResponse = await llm.invoke(topicsPrompt);
    const topicsContent = typeof topicsResponse.content === 'string' ? topicsResponse.content : topicsResponse.content.join('\n');
    topics = topicsContent
      .split('\n')
      .map(t => t.replace(/^[0-9-.\s]*/, '').trim())
      .filter(t => t.length > 0);
  }

  // Calculate participant stats if requested
  let participants: RecapResult['participants'] | undefined;
  if (includeParticipants) {
    const userCounts = new Map<string, number>();
    filteredMessages.forEach(msg => {
      const userId = msg.metadata?.userId || msg.metadata?.senderId;
      if (userId) {
        userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
      }
    });

    const topContributors = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        userId,
        username: userId, // TODO: Fetch usernames from database
        messageCount: count
      }));

    participants = {
      total: userCounts.size,
      active: topContributors.length,
      topContributors
    };
  }

  return {
    summary,
    keyPoints,
    messageCount: filteredMessages.length,
    timeRange: {
      start: startTime,
      end: endTime
    },
    ...(topics && { topics }),
    ...(participants && { participants })
  };
} 