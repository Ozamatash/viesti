"use client";

import { useState } from 'react';
import {
  RecapTrigger,
  RecapTimeframeSelect,
  RecapContent,
  RecapDialog,
  RecapSkeleton,
} from '~/components/recap/RecapComponents';
import { RecapTimeframe } from '~/types/recap';
import { useRecap } from '~/hooks/useRecap';

interface DMRecapProps {
  conversationId: string;
  participantName: string;
}

export function DMRecap({ conversationId, participantName }: DMRecapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<RecapTimeframe['value']>('day');

  const { recap, isLoading, generateRecap } = useRecap({
    type: 'direct',
    id: conversationId,
    timeframe,
    options: {
      includeParticipants: true,
      maxMessages: 500, // Lower limit for DMs
      includeTopics: true // Can be helpful for long conversations
    }
  });

  const handleGenerate = async () => {
    await generateRecap();
    setIsOpen(true);
  };

  return (
    <>
      <RecapTrigger 
        onClick={handleGenerate} 
        isLoading={isLoading}
        label="Conversation Recap"
      />

      <RecapDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Recap with ${participantName}`}
      >
        <div className="space-y-4">
          <RecapTimeframeSelect
            value={timeframe}
            onChange={(value) => setTimeframe(value)}
          />
          
          {isLoading && <RecapSkeleton />}
          {!isLoading && recap && <RecapContent recap={recap} />}
        </div>
      </RecapDialog>
    </>
  );
} 