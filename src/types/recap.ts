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
  generatedAt: string;
}

export interface RecapRequest {
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

export interface RecapResponse {
  data: RecapData;
  meta: RecapMeta;
}

export interface RecapTriggerProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

export interface RecapTimeframeSelectProps {
  value: RecapTimeframe['value'];
  onChange: (value: RecapTimeframe['value']) => void;
}

export interface RecapContentProps {
  recap: RecapData;
}

export interface RecapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
} 