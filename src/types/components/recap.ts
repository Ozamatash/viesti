import { RecapData, RecapTimeframe } from '../ai/recap';

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

export interface RecapGenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
} 