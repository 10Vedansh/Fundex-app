import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TERM_DEFINITIONS } from '@/utils/termDefinitions';

interface TermTooltipProps {
  term: string;
  className?: string;
}

export function TermTooltip({ term, className }: TermTooltipProps) {
  const definition = TERM_DEFINITIONS[term];
  if (!definition) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className={`inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-muted/50 transition-colors ${className || ''}`}>
            <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-primary transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[280px] text-xs leading-relaxed z-[9999]" 
          sideOffset={6}
          collisionPadding={16}
          avoidCollisions={true}
        >
          <p className="font-semibold text-foreground mb-0.5">{term}</p>
          <p className="text-muted-foreground">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
