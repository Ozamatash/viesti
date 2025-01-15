"use client";

import { useState } from 'react';
import {
  RecapTrigger,
  RecapTimeframeSelect,
  RecapContent,
  RecapDialog,
  RecapSkeleton,
} from '~/components/recap/RecapComponents';
import { RecapTimeframe } from '~/types';
import { useRecap } from '~/hooks/useRecap';

interface ChannelRecapProps {
  channelId: string;
  channelName: string;
}

export function ChannelRecap({ channelId, channelName }: ChannelRecapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<RecapTimeframe['value']>('day');

  const { recap, isLoading, generateRecap } = useRecap({
    type: 'channel',
    id: channelId,
    timeframe,
    options: {
      includeThreads: true,
      includeTopics: true,
      includeParticipants: true,
      maxMessages: 1000 // Reasonable limit for analysis
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
        label="Channel Recap"
      />

      <RecapDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Recap for #${channelName}`}
      >
        <div className="space-y-4">
          <RecapTimeframeSelect
            value={timeframe}
            onChange={(value: RecapTimeframe['value']) => setTimeframe(value)}
          />
          
          {isLoading && <RecapSkeleton />}
          {!isLoading && recap && <RecapContent recap={recap} />}
        </div>
      </RecapDialog>
    </>
  );
} 