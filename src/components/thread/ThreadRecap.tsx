"use client";

import { useState } from 'react';
import {
  RecapTrigger,
  RecapTimeframeSelect,
  RecapContent,
  RecapSkeleton,
} from '~/components/recap/RecapComponents';
import { RecapTimeframe } from '~/types/recap';
import { useRecap } from '~/hooks/useRecap';
import { Card } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';

interface ThreadRecapProps {
  threadId: string;
  messageCount: number;
}

export function ThreadRecap({ threadId, messageCount }: ThreadRecapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeframe, setTimeframe] = useState<RecapTimeframe['value']>('day');

  const { recap, isLoading, generateRecap } = useRecap({
    type: 'thread',
    id: threadId,
    timeframe,
    options: {
      includeParticipants: true,
      maxMessages: 500, // Lower limit for threads
      includeTopics: true // Helpful for long threads
    }
  });

  const handleGenerate = async () => {
    if (!recap) {
      await generateRecap();
    }
    setIsExpanded(true);
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="w-full"
    >
      <CollapsibleTrigger asChild>
        <div>
          <RecapTrigger 
            onClick={handleGenerate}
            isLoading={isLoading}
            label={`Thread Summary (${messageCount} messages)`}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <Card className="p-4">
          <div className="mb-4">
            <RecapTimeframeSelect
              value={timeframe}
              onChange={(value) => {
                setTimeframe(value);
                generateRecap();
              }}
            />
          </div>

          {isLoading && <RecapSkeleton />}
          {!isLoading && recap && <RecapContent recap={recap} />}
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
} 