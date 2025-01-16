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
        label="Channel Recap"
      />

      <RecapDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Recap for #${channelName}`}
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