import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { searchSimilarDocuments } from "./vector-store";
import { getAIEnvVars, defaultAIConfig } from "~/config/ai";
import { MessageMetadata, RecapData, RecapType } from "~/types";
import { db } from "~/server/db";

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
    type: 'channel',
    promptTemplate: `Provide a clear and structured summary of this channel's conversation.
Format the summary in the following way:

1. Start with a brief overview paragraph

2. Then list the key updates and developments as bullet points:
• Use bullet points (•) for each distinct update
• Keep each point concise (1 line if possible)
• Start each point with a bold category (e.g. **Updates:**, **Decisions:**, **Action Items:**) when appropriate
• Include timestamps when mentioned

Example format:
The team discussed project updates and coordinated upcoming tasks. Several important decisions were made regarding the release schedule.

• **Updates:** Performance improvements deployed to production
• **Meeting:** Team sync scheduled for tomorrow at 2 PM
• **Action Item:** Update dependencies before running new version
• **Decision:** Next release planned for Friday

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
    includeTopics = false,
    includeParticipants = false
  } = options;

  // Get all messages from the thread
  const allMessages = await db.message.findMany({
    where: {
      OR: [
        { id: parseInt(threadId) },
        { parentMessageId: parseInt(threadId) }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Transform messages to Document format
  const messages = allMessages.map(msg => new Document({
    pageContent: msg.content,
    metadata: {
      messageId: msg.id.toString(),
      channelId: msg.channelId.toString(),
      userId: msg.user.id,
      timestamp: msg.createdAt.toISOString(),
      type: msg.parentMessageId ? 'thread_reply' : 'message' as const,
      threadId: msg.parentMessageId ? msg.parentMessageId.toString() : null
    } satisfies MessageMetadata
  }));

  return await generateRecap(messages, {
    startTime,
    endTime,
    includeTopics,
    includeParticipants,
    type: 'thread',
    promptTemplate: `Provide a concise summary of this conversation thread.
Write a brief summary that captures the main points and context.
Focus on:
- Original question or topic
- Key discussion points and insights
- Decisions made or conclusions reached
- Action items and next steps
${includeTopics ? 'Include relevant topics discussed.' : ''}
${includeParticipants ? 'Note participant contributions where significant.' : ''}
Maintain a neutral, factual tone.

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
    type: 'direct',
    promptTemplate: `Provide a concise summary of this direct message conversation.
Write a brief summary that captures the main points and context.
Focus on:
- Key discussion points and agreements
- Decisions made or conclusions reached
- Action items and next steps
- Important updates or information shared
${includeTopics ? 'Include relevant topics discussed.' : ''}
${includeParticipants ? 'Note engagement and key exchanges.' : ''}
Maintain a neutral, factual tone.

Conversation:
{messages}

Summary:`
  });
}

interface GenerateRecapOptions extends Required<Pick<RecapOptions, 'startTime' | 'endTime' | 'includeTopics' | 'includeParticipants'>> {
  promptTemplate: string;
  type: RecapType;
}

/**
 * Core recap generation function used by all recap types
 */
async function generateRecap(
  messages: Document<MessageMetadata>[],
  options: GenerateRecapOptions
): Promise<RecapResult> {
  const { startTime, endTime, includeTopics, includeParticipants, promptTemplate, type } = options;

  console.log("[RECAP] Generating recap with messages:", messages.length);

  // Filter by timestamp (skip for threads)
  const filteredMessages = type === 'thread' 
    ? messages 
    : messages.filter(msg => {
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

  console.log("[RECAP] Messages after filtering:", filteredMessages.length);

  if (filteredMessages.length === 0) {
    console.log("[RECAP] No messages found");
    return {
      summary: type === 'thread' 
        ? "No messages found in this thread."
        : "No messages found in the specified time range.",
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

    // Get all unique user IDs
    const userIds = Array.from(userCounts.keys());

    // Fetch user data from database
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        username: true
      }
    });

    // Create a map of user IDs to usernames
    const userMap = new Map(users.map(user => [user.id, user.username]));

    const topContributors = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        userId,
        username: userMap.get(userId) || 'Unknown User',
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