import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MutualFund } from '@/types/mutualFund';

interface SectorSearchDropdownProps {
  funds: MutualFund[];
  selectedFundId: string;
  onSelect: (fundId: string) => void;
  placeholder?: string;
}

export function SectorSearchDropdown({ 
  funds, 
  selectedFundId, 
  onSelect, 
  placeholder = "Search funds..." 
}: SectorSearchDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedFund = useMemo(() => 
    funds.find(f => f.id === selectedFundId), 
    [funds, selectedFundId]
  );

  // Group funds by AMC
  const groupedFunds = useMemo(() => {
    const groups: Record<string, MutualFund[]> = {};
    funds.forEach(fund => {
      if (!groups[fund.amc]) {
        groups[fund.amc] = [];
      }
      groups[fund.amc].push(fund);
    });
    return groups;
  }, [funds]);

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
            {Object.entries(groupedFunds).map(([amc, amcFunds]) => (
              <CommandGroup key={amc} heading={amc}>
                {amcFunds.map((fund) => (
                  <CommandItem
                    key={fund.id}
                    value={`${fund.name} ${fund.amc}`}
                    onSelect={() => {
                      onSelect(fund.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFundId === fund.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm truncate">{fund.name}</span>
                      <span className="text-xs text-muted-foreground">{fund.category}</span>
                    </div>
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
