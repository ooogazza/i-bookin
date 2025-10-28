import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LIFT_TYPE_INFO } from "@/lib/liftTypeLabels";

interface LiftTypeLabelProps {
  liftType: string;
  showFullLabel?: boolean;
  className?: string;
}

export const LiftTypeLabel = ({ liftType, showFullLabel = false, className = "" }: LiftTypeLabelProps) => {
  const info = LIFT_TYPE_INFO[liftType as keyof typeof LIFT_TYPE_INFO];
  
  if (!info) {
    return <span className={className}>{liftType}</span>;
  }

  const displayLabel = showFullLabel ? info.fullLabel : info.label;
  const hasDescription = info.description && info.description.trim() !== "";

  if (!hasDescription) {
    return <span className={className}>{displayLabel}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className={`inline-flex items-center gap-1 hover:text-primary transition-colors cursor-help ${className}`}
          type="button"
        >
          {displayLabel}
          <Info className="h-3.5 w-3.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-sm p-3">
        <p className="text-sm font-medium">{info.fullLabel}</p>
        {hasDescription && (
          <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
