import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Skeleton } from "~/components/ui/skeleton"
import { 
  TIMEFRAME_OPTIONS,
  RecapTriggerProps,
  RecapTimeframeSelectProps,
  RecapContentProps,
  RecapDialogProps
} from "~/types"

export function RecapTrigger({ onClick, isLoading, label = "Generate Recap" }: RecapTriggerProps) {
  return (
    <Button 
      onClick={onClick} 
      disabled={isLoading}
      variant="ghost"
      size="sm"
    >
      {isLoading ? "Generating..." : label}
    </Button>
  )
}

export function RecapTimeframeSelect({ value, onChange }: RecapTimeframeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select timeframe" />
      </SelectTrigger>
      <SelectContent>
        {TIMEFRAME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function RecapContent({ recap }: RecapContentProps) {
  if (!recap) {
    return <div>No recap data available</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground">{recap.summary}</p>
      </div>

      {recap.keyPoints && recap.keyPoints.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Key Points</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {recap.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {recap.actionItems && recap.actionItems.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Action Items</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {recap.actionItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {recap.topics && recap.topics.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Topics Discussed</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {recap.topics.map((topic, i) => (
              <li key={i}>{topic}</li>
            ))}
          </ul>
        </div>
      )}

      {recap.participants && (
        <div>
          <h3 className="font-semibold mb-2">Participants</h3>
          <div className="text-sm text-muted-foreground">
            <p>Total participants: {recap.participants.total}</p>
            <p>Active participants: {recap.participants.active}</p>
            {recap.participants.topContributors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Top contributors:</p>
                <ul className="list-disc list-inside">
                  {recap.participants.topContributors.map((user, i) => (
                    <li key={i}>
                      {user.username} ({user.messageCount} messages)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecapDialog({ open, onOpenChange, title, children }: RecapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function RecapSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-[100px] w-full" />
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[100px] w-full" />
    </div>
  )
} 