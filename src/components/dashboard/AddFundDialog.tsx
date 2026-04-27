import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, Plus } from 'lucide-react';
import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { cn } from '@/lib/utils';

interface AddFundDialogProps {
  open: boolean;
  onClose: () => void;
  funds: MutualFund[];
  onAdd: (
    fund: MutualFund,
    details: { invested_amount?: number; sip_amount?: number; is_sip?: boolean }
  ) => Promise<boolean | void> | void;
}

type Step = 'search' | 'mode' | 'details';

export function AddFundDialog({ open, onClose, funds, onAdd }: AddFundDialogProps) {
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MutualFund | null>(null);
  const [isSip, setIsSip] = useState(false);
  const [investedAmount, setInvestedAmount] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset on close
      setTimeout(() => {
        setStep('search');
        setQuery('');
        setSelected(null);
        setIsSip(false);
        setInvestedAmount('');
        setSipAmount('');
        setSubmitting(false);
      }, 200);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return funds.slice(0, 8);
    const q = query.toLowerCase();
    return funds
      .filter((f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, funds]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    await onAdd(selected, {
      invested_amount: investedAmount ? parseFloat(investedAmount) : undefined,
      sip_amount: sipAmount ? parseFloat(sipAmount) : undefined,
      is_sip: isSip,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'search' && (
              <button
                onClick={() => setStep(step === 'details' ? 'mode' : 'search')}
                className="p-1 -ml-1 rounded hover:bg-white/5"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {step === 'search' && 'Add a Mutual Fund'}
            {step === 'mode' && 'Investment type'}
            {step === 'details' && 'Investment details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Search by fund name or AMC.'}
            {step === 'mode' && selected?.name}
            {step === 'details' && selected?.name}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search mutual funds..."
                autoFocus
                className="pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelected(f);
                    setStep('mode');
                  }}
                  className="w-full text-left p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-white/5 hover:border-white/20 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground line-clamp-1">{f.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.amc} • {CATEGORY_LABELS[f.category] || f.category}
                  </p>
                </button>
              ))}
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No funds found</p>
              )}
            </div>
          </div>
        )}

        {step === 'mode' && (
          <div className="space-y-3 py-2">
            <button
              onClick={() => {
                setIsSip(false);
                setStep('details');
              }}
              className={cn(
                'w-full text-left p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-white/5 hover:border-white/20 transition-colors'
              )}
            >
              <p className="text-sm font-semibold text-foreground">Lumpsum</p>
              <p className="text-xs text-muted-foreground mt-1">One-time investment in this fund.</p>
            </button>
            <button
              onClick={() => {
                setIsSip(true);
                setStep('details');
              }}
              className={cn(
                'w-full text-left p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-white/5 hover:border-white/20 transition-colors'
              )}
            >
              <p className="text-sm font-semibold text-foreground">SIP</p>
              <p className="text-xs text-muted-foreground mt-1">Recurring monthly investment.</p>
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4 py-2">
            {!isSip ? (
              <div className="space-y-2">
                <Label htmlFor="invested">Invested amount (₹)</Label>
                <Input
                  id="invested"
                  type="number"
                  placeholder="e.g., 50000"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(e.target.value)}
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sip">Monthly SIP amount (₹)</Label>
                  <Input
                    id="sip"
                    type="number"
                    placeholder="e.g., 5000"
                    value={sipAmount}
                    onChange={(e) => setSipAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invested-sip">Total invested so far (₹) — optional</Label>
                  <Input
                    id="invested-sip"
                    type="number"
                    placeholder="e.g., 60000"
                    value={investedAmount}
                    onChange={(e) => setInvestedAmount(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Plus className="h-4 w-4 mr-1" />
                Add to portfolio
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
