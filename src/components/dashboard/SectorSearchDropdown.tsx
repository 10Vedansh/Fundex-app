import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MutualFund } from '@/types/mutualFund';

interface SectorSearchDropdownProps {
  funds: MutualFund[];
  selectedFundId: string;
  onSelect: (fundId: string) => void;
  placeholder?: string;
  watchlistFundIds?: string[];
  onBookmarkToggle?: (fund: MutualFund) => void;
}

export function SectorSearchDropdown({ 
  funds, 
  selectedFundId, 
  onSelect, 
  placeholder = "Search funds...",
  watchlistFundIds = [],
  onBookmarkToggle
}: SectorSearchDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedFund = useMemo(() => 
    funds.find(f => f.id === selectedFundId), 
    [funds, selectedFundId]
  );

  // Separate watchlist funds from others
  const { watchlistFunds, otherFunds } = useMemo(() => {
    const watchlist: MutualFund[] = [];
    const others: MutualFund[] = [];
    
    funds.forEach(fund => {
      if (watchlistFundIds.includes(fund.id)) {
        watchlist.push(fund);
      } else {
        others.push(fund);
      }
    });
    
    return { watchlistFunds: watchlist, otherFunds: others };
  }, [funds, watchlistFundIds]);

  // Group other funds by AMC
  const groupedOtherFunds = useMemo(() => {
    const groups: Record<string, MutualFund[]> = {};
    otherFunds.forEach(fund => {
      if (!groups[fund.amc]) {
        groups[fund.amc] = [];
      }
      groups[fund.amc].push(fund);
    });
    return groups;
  }, [otherFunds]);

  const handleBookmark = (e: React.MouseEvent, fund: MutualFund) => {
    e.stopPropagation();
    onBookmarkToggle?.(fund);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between glass-card border-border/50 hover:bg-secondary/50"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {selectedFund ? selectedFund.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 glass-card border-border/50" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No fund found.</CommandEmpty>
            
            {/* Watchlist funds first */}
            {watchlistFunds.length > 0 && (
              <>
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-primary fill-primary" />
                    Watchlist
                  </span>
                }>
                  {watchlistFunds.map((fund) => (
                    <CommandItem
                      key={fund.id}
                      value={`watchlist-${fund.name} ${fund.amc}`}
                      onSelect={() => {
                        onSelect(fund.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            selectedFundId === fund.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{fund.name}</span>
                          <span className="text-xs text-muted-foreground">{fund.amc} • {fund.category}</span>
                        </div>
                      </div>
                      {onBookmarkToggle && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={(e) => handleBookmark(e, fund)}
                        >
                          <Star className="h-3 w-3 fill-primary text-primary" />
                        </Button>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            {/* Other funds grouped by AMC */}
            {Object.entries(groupedOtherFunds).map(([amc, amcFunds]) => (
              <CommandGroup key={amc} heading={amc}>
                {amcFunds.map((fund) => (
                  <CommandItem
                    key={fund.id}
                    value={`${fund.name} ${fund.amc}`}
                    onSelect={() => {
                      onSelect(fund.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          selectedFundId === fund.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{fund.name}</span>
                        <span className="text-xs text-muted-foreground">{fund.category}</span>
                      </div>
                    </div>
                    {onBookmarkToggle && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => handleBookmark(e, fund)}
                      >
                        <Star className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </Button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
