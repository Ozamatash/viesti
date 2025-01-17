"use client";

import { useState } from 'react';
import {
  RecapTrigger,
  RecapContent,
  RecapSkeleton,
} from '~/components/recap/RecapComponents';
import { useRecap } from '~/hooks/useRecap';
import { Card } from '~/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';

interface ThreadRecapProps {
  threadId: string;
  messageCount: number;
}

export function ThreadRecap({ threadId, messageCount }: ThreadRecapProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { recap, isLoading, generateRecap } = useRecap({
    type: 'thread',
    id: threadId,
    options: {
      includeParticipants: true,
      includeTopics: true
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
          {isLoading && <RecapSkeleton />}
          {!isLoading && recap && <RecapContent recap={recap} />}
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
} 