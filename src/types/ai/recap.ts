// Core recap types
export type RecapType = 'channel' | 'thread' | 'direct';

export type RecapTimeframe = {
  value: 'day' | 'week' | 'month';
  label: string;
}

export const TIMEFRAME_OPTIONS: RecapTimeframe[] = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
]

export interface RecapData {
  summary: string;
  keyPoints?: string[];
  actionItems?: string[];
  topics?: string[];
  messageCount: number;
  timeRange: {
    start: string;
    end: string;
  };
  participants?: {
    total: number;
    active: number;
    topContributors: {
      userId: string;
      username: string;
      messageCount: number;
    }[];
  };
  threads?: {
    total: number;
    active: number;
    resolved: number;
  };
  generatedAt: string;
}

// Parameters for recap generation
export interface RecapParams {
  type: RecapType;
  id: string;
  startTime?: string;
  endTime?: string;
  maxMessages?: number;
  includeThreads?: boolean;
  includeTopics?: boolean;
  includeParticipants?: boolean;
}

export interface RecapMeta {
  timestamp: string;
  requestId: string;
} 