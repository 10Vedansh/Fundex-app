import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
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
  placeholder = 'Select fund...',
}: SectorSearchDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedFund = useMemo(
    () => funds.find((f) => f.id === selectedFundId),
    [funds, selectedFundId]
  );

  // Group funds by AMC for better organization
  const groupedFunds = useMemo(() => {
    const groups: Record<string, MutualFund[]> = {};
    funds.forEach((fund) => {
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
          className="w-full justify-between bg-secondary/50 border-border hover:bg-secondary h-12"
        >
          <span className="truncate text-left flex-1">
            {selectedFund ? (
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground truncate max-w-[300px]">
                  {selectedFund.name}
                </span>
                <span className="text-xs text-muted-foreground">{selectedFund.amc}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="start">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search by fund name or AMC..."
              className="h-11 border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No fund found.</CommandEmpty>
            {Object.entries(groupedFunds).map(([amc, amcFunds]) => (
              <CommandGroup key={amc} heading={amc} className="text-muted-foreground">
                {amcFunds.map((fund) => (
                  <CommandItem
                    key={fund.id}
                    value={`${fund.name} ${fund.amc}`}
                    onSelect={() => {
                      onSelect(fund.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedFundId === fund.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[320px]">{fund.name}</span>
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
