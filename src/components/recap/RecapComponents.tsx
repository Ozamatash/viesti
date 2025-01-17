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
  RecapDialogProps,
  RecapGenerateButtonProps,
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

export function RecapGenerateButton({ onClick, isLoading, disabled }: RecapGenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full mt-4"
    >
      {isLoading ? "Generating..." : "Generate Recap"}
    </Button>
  )
}

export function RecapContent({ recap }: RecapContentProps) {
  if (!recap) {
    return <div>No recap data available</div>;
  }

  // Split summary into overview and bullet points
  const [overview, ...bulletPoints] = recap.summary.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-6 p-4">
      {/* Overview Section */}
      <div className="prose dark:prose-invert max-w-none">
        <h3 className="text-lg font-semibold mb-2">Overview</h3>
        <p className="text-sm leading-relaxed">{overview}</p>
      </div>

      {/* Updates Section */}
      {bulletPoints.length > 0 && (
        <div className="prose dark:prose-invert max-w-none">
          <h3 className="text-lg font-semibold mb-2">Key Updates</h3>
          <div className="space-y-2">
            {bulletPoints.join('\n')
              .split('\n')
              .filter(point => point.trim().startsWith('•'))
              .map((point, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-2 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: point
                      .replace('•', '')
                      .trim()
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }}
                />
              ))}
          </div>
        </div>
      )}

      {/* Additional Sections */}
      {recap.topics && recap.topics.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Topics Discussed</h3>
          <div className="flex flex-wrap gap-2">
            {recap.topics.map((topic, i) => (
              <span 
                key={i}
                className="px-2 py-1 bg-secondary rounded-md text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {recap.participants && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Participation</h3>
          <div className="text-sm space-y-2">
            <div className="flex gap-4 text-muted-foreground">
              <span>Total: {recap.participants.total}</span>
              <span>Active: {recap.participants.active}</span>
            </div>
            {recap.participants.topContributors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium mb-1">Top Contributors:</p>
                <div className="grid grid-cols-2 gap-2">
                  {recap.participants.topContributors.map((user, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-muted-foreground">
                        ({user.messageCount} messages)
                      </span>
                    </div>
                  ))}
                </div>
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Controls section - always visible */}
          <div className="flex-none p-4 border-b">
            {children instanceof Array ? children[0] : null}
          </div>
          {/* Scrollable content section */}
          <div className="flex-1 overflow-y-auto p-4">
            {children instanceof Array ? children.slice(1) : children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RecapSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[100px] w-full" />
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[100px] w-full" />
    </div>
  )
} 