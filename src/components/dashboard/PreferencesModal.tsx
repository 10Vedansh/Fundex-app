import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Shield, Target, TrendingUp, Clock, GraduationCap, IndianRupee, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePreferences, PreferenceSelections, ValidationResult } from '@/utils/recommendation/preferenceValidator';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const riskOptions = [
  { value: 'conservative', label: 'Conservative', desc: 'Prefer stability over returns', icon: Shield },
  { value: 'moderate', label: 'Moderate', desc: 'Balance risk and returns', icon: Target },
  { value: 'aggressive', label: 'Aggressive', desc: 'Willing to take higher risks', icon: TrendingUp },
];

const goalOptions = [
  { value: 'wealth', label: 'Wealth Creation', desc: 'Long-term wealth building' },
  { value: 'income', label: 'Regular Income', desc: 'Dividend or interest income' },
  { value: 'preservation', label: 'Capital Preservation', desc: 'Protect principal amount' },
  { value: 'tax', label: 'Tax Saving', desc: 'ELSS and tax benefits' },
];

const horizonOptions = [
  { value: 'short', label: '< 3 Years', desc: 'Short-term goals' },
  { value: 'medium', label: '3-5 Years', desc: 'Medium-term planning' },
  { value: 'long', label: '5+ Years', desc: 'Long-term investment' },
];

const experienceOptions = [
  { value: 'beginner', label: 'Beginner', desc: 'New to investing' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
  { value: 'experienced', label: 'Experienced', desc: 'Regular investor' },
];

const investmentAmountOptions = [
  { value: 'small', label: 'Under ₹50K', desc: 'Starting small' },
  { value: 'medium', label: '₹50K - ₹5L', desc: 'Moderate investment' },
  { value: 'large', label: '₹5L+', desc: 'Significant portfolio' },
];

const IMPACT_HINTS: Record<string, string> = {
  risk_tolerance: 'Determines which fund categories are available — conservative limits to debt/hybrid, aggressive opens equity/sectoral.',
  investment_goal: 'Filters funds by purpose — tax saving restricts to ELSS, preservation to low-risk debt.',
  investment_horizon: 'Matches fund volatility to your timeline — shorter horizons prefer liquid/debt funds.',
  experience_level: 'Controls fund complexity — beginners see large-cap/index, experienced see thematic/small-cap.',
  investment_amount: 'Larger amounts apply quality filters — AUM minimums and expense ratio caps.',
};

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceSelections>({
    risk_tolerance: '',
    investment_goal: '',
    investment_horizon: '',
    experience_level: '',
    investment_amount: '',
  });

  useEffect(() => {
    if (profile) {
      setPreferences({
        risk_tolerance: profile.risk_tolerance || '',
        investment_goal: profile.investment_goal || '',
        investment_horizon: profile.investment_horizon || '',
        experience_level: profile.experience_level || '',
        investment_amount: profile.investment_amount || '',
      });
    }
  }, [profile]);

  // Run validation whenever preferences change
  const validation: ValidationResult = useMemo(
    () => validatePreferences(preferences),
    [preferences],
  );

  // Apply auto-resets from the validator
  useEffect(() => {
    const resets = validation.autoResets;
    if (Object.keys(resets).length === 0) return;

    setPreferences(prev => {
      const next = { ...prev };
      let changed = false;
      for (const [key, val] of Object.entries(resets)) {
        if (prev[key as keyof PreferenceSelections] !== val) {
          (next as any)[key] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [validation.autoResets]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfile(preferences);
      await refreshProfile();
      toast.success('Preferences updated! Your personalized funds will refresh.');
      onClose();
    } catch {
      toast.error('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = useCallback((field: keyof PreferenceSelections, value: string) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Investment Preferences</DialogTitle>
          <DialogDescription>
            Update your preferences to get personalized fund suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <PreferenceSection
            label="Risk Tolerance"
            icon={Shield}
            hint={IMPACT_HINTS.risk_tolerance}
            nudge={validation.nudges.risk_tolerance}
          >
            <div className="grid gap-2">
              {riskOptions.map(opt => {
                const disabledEntry = validation.disabledRisk.find(d => d.value === opt.value);
                return (
                  <OptionCard
                    key={opt.value}
                    selected={preferences.risk_tolerance === opt.value}
                    disabled={!!disabledEntry}
                    disabledReason={disabledEntry?.reason}
                    onClick={() => updateField('risk_tolerance', opt.value)}
                    label={opt.label}
                    desc={opt.desc}
                    icon={opt.icon}
                  />
                );
              })}
            </div>
          </PreferenceSection>

          <PreferenceSection
            label="Investment Goal"
            icon={Target}
            hint={IMPACT_HINTS.investment_goal}
            nudge={validation.nudges.investment_goal}
          >
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map(opt => {
                const disabledEntry = validation.disabledGoal.find(d => d.value === opt.value);
                return (
                  <OptionCard
                    key={opt.value}
                    selected={preferences.investment_goal === opt.value}
                    disabled={!!disabledEntry}
                    disabledReason={disabledEntry?.reason}
                    onClick={() => updateField('investment_goal', opt.value)}
                    label={opt.label}
                    desc={opt.desc}
                  />
                );
              })}
            </div>
          </PreferenceSection>

          <PreferenceSection
            label="Investment Horizon"
            icon={Clock}
            hint={IMPACT_HINTS.investment_horizon}
            nudge={validation.nudges.investment_horizon}
          >
            <div className="grid grid-cols-3 gap-2">
              {horizonOptions.map(opt => {
                const disabledEntry = validation.disabledHorizon.find(d => d.value === opt.value);
                return (
                  <OptionCard
                    key={opt.value}
                    selected={preferences.investment_horizon === opt.value}
                    disabled={!!disabledEntry}
                    disabledReason={disabledEntry?.reason}
                    onClick={() => updateField('investment_horizon', opt.value)}
                    label={opt.label}
                    desc={opt.desc}
                  />
                );
              })}
            </div>
          </PreferenceSection>

          <PreferenceSection
            label="Experience Level"
            icon={GraduationCap}
            hint={IMPACT_HINTS.experience_level}
            nudge={validation.nudges.experience_level}
          >
            <div className="grid grid-cols-3 gap-2">
              {experienceOptions.map(opt => {
                const disabledEntry = validation.disabledExperience.find(d => d.value === opt.value);
                return (
                  <OptionCard
                    key={opt.value}
                    selected={preferences.experience_level === opt.value}
                    disabled={!!disabledEntry}
                    disabledReason={disabledEntry?.reason}
                    onClick={() => updateField('experience_level', opt.value)}
                    label={opt.label}
                    desc={opt.desc}
                  />
                );
              })}
            </div>
          </PreferenceSection>

          <PreferenceSection
            label="Investment Amount"
            icon={IndianRupee}
            hint={IMPACT_HINTS.investment_amount}
          >
            <div className="grid grid-cols-3 gap-2">
              {investmentAmountOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.investment_amount === opt.value}
                  disabled={false}
                  onClick={() => updateField('investment_amount', opt.value)}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </PreferenceSection>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ──

function PreferenceSection({
  label,
  icon: Icon,
  hint,
  nudge,
  children,
}: {
  label: string;
  icon: React.ElementType;
  hint: string;
  nudge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {label}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex">
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs z-[9999]">
              {hint}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </label>
      {nudge && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{nudge}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  disabled,
  disabledReason,
  onClick,
  label,
  desc,
  icon: Icon,
}: {
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
  label: string;
  desc: string;
  icon?: React.ElementType;
}) {
  const card = (
    <Card
      className={cn(
        'transition-all duration-200',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer hover:border-primary/50',
        selected && !disabled && 'border-primary bg-primary/5',
      )}
      onClick={() => !disabled && onClick()}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              selected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm', selected && 'text-primary')}>{label}</p>
          <p className="text-xs text-muted-foreground truncate">{desc}</p>
        </div>
        <div
          className={cn(
            'h-4 w-4 rounded-full border-2 flex-shrink-0',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
          )}
        >
          {selected && (
            <div className="h-full w-full rounded-full flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs z-[9999] max-w-[260px]">
            {disabledReason || 'This combination is not suitable'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}
