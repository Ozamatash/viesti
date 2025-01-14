import { useState } from 'react';
import { RecapType, RecapRequest, RecapResponse, RecapData, RecapTimeframe } from '~/types/recap';

interface UseRecapProps {
  type: RecapType;
  id: string;
  timeframe: RecapTimeframe['value'];
  options?: {
    maxMessages?: number;
    includeThreads?: boolean;
    includeTopics?: boolean;
    includeParticipants?: boolean;
  };
}

interface UseRecapReturn {
  recap: RecapData | null;
  isLoading: boolean;
  error: Error | null;
  generateRecap: () => Promise<void>;
}

const getTimeRangeForTimeframe = (timeframe: UseRecapProps['timeframe']) => {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString()
  };
};

export function useRecap({ type, id, timeframe, options = {} }: UseRecapProps): UseRecapReturn {
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateRecap = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const timeRange = getTimeRangeForTimeframe(timeframe);
      
      const request: RecapRequest = {
        type,
        id,
        ...timeRange,
        ...options
      };

      const response = await fetch('/api/recap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recap');
      }

      const { data } = (await response.json()) as RecapResponse;
      setRecap(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    recap,
    isLoading,
    error,
    generateRecap
  };
} 