"use client";

import { useState } from 'react';
import {
  RecapTrigger,
  RecapTimeframeSelect,
  RecapContent,
  RecapDialog,
  RecapSkeleton,
  RecapGenerateButton
} from '~/components/recap/RecapComponents';
import { RecapTimeframe } from '~/types';
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

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  const handleGenerate = async () => {
    await generateRecap();
  };

  return (
    <>
      <RecapTrigger 
        onClick={handleOpenDialog}
        label="Conversation Recap"
      />

      <RecapDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Recap with ${participantName}`}
      >
        {/* Controls Section */}
        <div className="space-y-4">
          <RecapTimeframeSelect
            value={timeframe}
            onChange={(value: RecapTimeframe['value']) => setTimeframe(value)}
          />
          
          <RecapGenerateButton
            onClick={handleGenerate}
            isLoading={isLoading}
          />
        </div>

        {/* Content Section */}
        <div>
          {isLoading && <RecapSkeleton />}
          {!isLoading && recap && <RecapContent recap={recap} />}
        </div>
      </RecapDialog>
    </>
  );
} 