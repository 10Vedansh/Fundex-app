import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MutualFund } from '@/types/mutualFund';
import { Calculator, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SIPCalculatorProps {
  fund: MutualFund;
}

function SIPCalculatorSection({ 
  cagr, 
  label 
}: { 
  cagr: number; 
  label: string; 
}) {
  const [monthlyAmount, setMonthlyAmount] = useState(5000);
  const [years, setYears] = useState(5);

  const results = useMemo(() => {
    const monthlyRate = cagr / 100 / 12;
    const months = years * 12;
    const totalInvested = monthlyAmount * months;

    let futureValue: number;
    if (monthlyRate === 0) {
      futureValue = totalInvested;
    } else {
      futureValue =
        monthlyAmount *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
        (1 + monthlyRate);
    }

    const wealthGained = futureValue - totalInvested;

    return { totalInvested, futureValue, wealthGained };
  }, [monthlyAmount, years, cagr]);

  return (
    <div className="space-y-5 pb-5 border-b border-border/30 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      
      {/* Monthly amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Monthly SIP Amount</Label>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
            <IndianRupee className="h-3 w-3 text-muted-foreground" />
            <Input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Math.max(500, Number(e.target.value)))}
              className="w-20 h-6 text-xs border-0 bg-transparent p-0 text-right font-semibold"
            />
          </div>
        </div>
        <Slider
          value={[monthlyAmount]}
          onValueChange={([v]) => setMonthlyAmount(v)}
          min={500}
          max={100000}
          step={500}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>₹500</span>
          <span>₹1,00,000</span>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Investment Duration</Label>
          <span className="text-xs font-semibold bg-secondary/50 rounded-md px-2 py-1">
            {years} {years === 1 ? 'Year' : 'Years'}
          </span>
        </div>
        <Slider
          value={[years]}
          onValueChange={([v]) => setYears(v)}
          min={1}
          max={30}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1Y</span>
          <span>30Y</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3 pt-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Invested</p>
          <p className="text-sm font-bold text-foreground">
            ₹{results.totalInvested.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Est. Returns</p>
          <p className={cn(
            'text-sm font-bold',
            results.wealthGained >= 0 ? 'text-success' : 'text-destructive'
          )}>
            ₹{Math.round(results.wealthGained).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Total Value</p>
          <p className="text-sm font-bold text-primary">
            ₹{Math.round(results.futureValue).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="h-3 rounded-full overflow-hidden bg-secondary/40 flex">
        <div
          className="bg-primary/60 transition-all duration-300"
          style={{ width: `${(results.totalInvested / results.futureValue) * 100}%` }}
        />
        <div
          className="bg-success/60 transition-all duration-300"
          style={{ width: `${(results.wealthGained / results.futureValue) * 100}%` }}
        />
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/60" /> Invested
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success/60" /> Returns
        </span>
      </div>
    </div>
  );
}

export function SIPCalculator({ fund }: SIPCalculatorProps) {
  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          SIP Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <SIPCalculatorSection cagr={fund.cagr1Y} label="1-Year CAGR Based" />
        <SIPCalculatorSection cagr={fund.cagr3Y} label="3-Year CAGR Based" />
        <SIPCalculatorSection cagr={fund.cagr5Y} label="5-Year CAGR Based" />
      </CardContent>
    </Card>
  );
}
