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

type CalcMode = 'sip' | 'lumpsum';

export function SIPCalculator({ fund }: SIPCalculatorProps) {
  const [mode, setMode] = useState<CalcMode>('sip');
  const [monthlyAmount, setMonthlyAmount] = useState(5000);
  const [lumpSumAmount, setLumpSumAmount] = useState(100000);
  const [years, setYears] = useState(5);

  const safeCagr3Y = fund.cagr3Y ?? 0;

  const results = useMemo(() => {
    const rate = safeCagr3Y / 100;

    if (mode === 'sip') {
      const monthlyRate = rate / 12;
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
    } else {
      const totalInvested = lumpSumAmount;
      const futureValue = lumpSumAmount * Math.pow(1 + rate, years);
      const wealthGained = futureValue - totalInvested;
      return { totalInvested, futureValue, wealthGained };
    }
  }, [monthlyAmount, lumpSumAmount, years, safeCagr3Y, mode]);

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Investment Calculator
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            Based on 3Y CAGR: {fund.cagr3Y != null ? `${fund.cagr3Y.toFixed(1)}%` : 'NA'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-secondary/50 p-1">
            <button
              onClick={() => setMode('sip')}
              className={cn(
                'px-5 py-1.5 rounded-full text-xs font-semibold transition-all',
                mode === 'sip' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              SIP
            </button>
            <button
              onClick={() => setMode('lumpsum')}
              className={cn(
                'px-5 py-1.5 rounded-full text-xs font-semibold transition-all',
                mode === 'lumpsum' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Lump Sum
            </button>
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {mode === 'sip' ? 'Monthly SIP Amount' : 'One-Time Investment'}
            </Label>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
              <IndianRupee className="h-3 w-3 text-muted-foreground" />
              <Input
                type="number"
                value={mode === 'sip' ? monthlyAmount : lumpSumAmount}
                onChange={(e) => {
                  const val = Math.max(mode === 'sip' ? 500 : 1000, Number(e.target.value));
                  mode === 'sip' ? setMonthlyAmount(val) : setLumpSumAmount(val);
                }}
                className="w-24 h-6 text-xs border-0 bg-transparent p-0 text-right font-semibold"
              />
            </div>
          </div>
          <Slider
            value={[mode === 'sip' ? monthlyAmount : lumpSumAmount]}
            onValueChange={([v]) => mode === 'sip' ? setMonthlyAmount(v) : setLumpSumAmount(v)}
            min={mode === 'sip' ? 500 : 1000}
            max={mode === 'sip' ? 100000 : 5000000}
            step={mode === 'sip' ? 500 : 5000}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{mode === 'sip' ? '₹500' : '₹1,000'}</span>
            <span>{mode === 'sip' ? '₹1,00,000' : '₹50,00,000'}</span>
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
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
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
      </CardContent>
    </Card>
  );
}
