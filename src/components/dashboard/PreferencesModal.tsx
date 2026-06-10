import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Shield, Target, TrendingUp, Clock, Wallet, AlertTriangle, PiggyBank, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRawFieldAvailability, validateProfile, ProfileState, RawOptionState } from '@/utils/recommendation/profileRules';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PersonaField {
  key: string;
  label: string;
  icon: React.ElementType;
  hint: string;
  options: { value: string; label: string; desc: string }[];
}

const FIELDS: PersonaField[] = [
  {
    key: 'investor_stage', label: 'Investor Stage', icon: Shield,
    hint: 'Your current life stage affects risk capacity and investment approach.',
    options: [
      { value: 'student', label: 'Student', desc: 'Pursuing education' },
      { value: 'early_career', label: 'Early Career', desc: 'Building foundation' },
      { value: 'mid_career', label: 'Mid-Career', desc: 'Growing responsibilities' },
      { value: 'business_owner', label: 'Business Owner', desc: 'Running my venture' },
      { value: 'retired', label: 'Retired', desc: 'Steady income needs' },
    ],
  },
  {
    key: 'primary_goal', label: 'Primary Goal', icon: Target,
    hint: 'Your main investment objective determines the fund categories recommended.',
    options: [
      { value: 'wealth_creation', label: 'Wealth Creation', desc: 'Long-term growth' },
      { value: 'retirement', label: 'Retirement', desc: 'Building retirement corpus' },
      { value: 'child_education', label: 'Family Goals', desc: 'Education & milestones' },
      { value: 'passive_income', label: 'Passive Income', desc: 'Regular returns' },
      { value: 'tax_saving', label: 'Tax Saving', desc: 'Tax efficiency' },
      { value: 'capital_preservation', label: 'Preservation', desc: 'Protect capital' },
    ],
  },
  {
    key: 'investment_horizon', label: 'Investment Horizon', icon: Clock,
    hint: 'Longer horizons allow for equity-heavy allocations and compounding.',
    options: [
      { value: '<3', label: '< 3 Years', desc: 'Short-term' },
      { value: '3-5', label: '3-5 Years', desc: 'Medium-term' },
      { value: '5-10', label: '5-10 Years', desc: 'Long-term' },
      { value: '>10', label: '> 10 Years', desc: 'Very long-term' },
    ],
  },
  {
    key: 'market_reaction', label: 'Market Reaction', icon: TrendingUp,
    hint: 'How you react to market downturns reveals your true risk tolerance.',
    options: [
      { value: 'withdraw', label: 'Withdraw', desc: 'Cut losses quickly' },
      { value: 'wait', label: 'Wait & Watch', desc: 'Stay invested' },
      { value: 'invest_more', label: 'Buy the Dip', desc: 'See opportunity' },
    ],
  },
  {
    key: 'experience_level', label: 'Experience', icon: AlertTriangle,
    hint: 'Experience level controls fund complexity in recommendations.',
    options: [
      { value: 'first_time', label: 'First-Time', desc: 'Just starting' },
      { value: 'some_experience', label: 'Some Experience', desc: 'Invested before' },
      { value: 'experienced', label: 'Experienced', desc: 'Well-versed' },
    ],
  },
  {
    key: 'existing_investments', label: 'Existing Investments', icon: Wallet,
    hint: 'Helps understand your overall financial picture and portfolio size.',
    options: [
      { value: 'none', label: 'None', desc: 'Starting fresh' },
      { value: 'under_5l', label: 'Under ₹5L', desc: 'Early stage' },
      { value: '5l_25l', label: '₹5L - ₹25L', desc: 'Building portfolio' },
      { value: '25l_plus', label: '₹25L+', desc: 'Significant' },
    ],
  },
  {
    key: 'emergency_fund', label: 'Emergency Fund', icon: PiggyBank,
    hint: 'A healthy emergency fund allows for higher risk investment capacity.',
    options: [
      { value: '<3_months', label: '< 3 Months', desc: 'Minimal buffer' },
      { value: '3_6_months', label: '3-6 Months', desc: 'Moderate safety' },
      { value: '>6_months', label: '> 6 Months', desc: 'Strong cushion' },
    ],
  },
];

const deriveRiskFromMarketReaction = (reaction: string | null): string => {
  switch (reaction) {
    case 'withdraw': return 'conservative';
    case 'wait': return 'moderate';
    case 'invest_more': return 'aggressive';
    default: return 'moderate';
  }
};

const deriveGoalFromPrimaryGoal = (goal: string | null): string => {
  switch (goal) {
    case 'wealth_creation': return 'wealth';
    case 'retirement': return 'wealth';
    case 'child_education': return 'wealth';
    case 'passive_income': return 'income';
    case 'tax_saving': return 'tax';
    case 'capital_preservation': return 'preservation';
    default: return 'wealth';
  }
};

const mapHorizon = (horizon: string | null): string => {
  switch (horizon) {
    case '<3': return 'short';
    case '3-5': return 'medium';
    case '5-10': return 'medium';
    case '>10': return 'long';
    default: return 'medium';
  }
};

const mapExperience = (exp: string | null): string => {
  switch (exp) {
    case 'first_time': return 'beginner';
    case 'some_experience': return 'intermediate';
    case 'experienced': return 'advanced';
    default: return 'beginner';
  }
};

const unmapHorizon = (horizon: string | null): string => {
  switch (horizon) {
    case 'short': return '<3';
    case 'medium': return '5-10';
    case 'long': return '>10';
    default: return '';
  }
};

const unmapExperience = (exp: string | null): string => {
  switch (exp) {
    case 'beginner': return 'first_time';
    case 'intermediate': return 'some_experience';
    case 'experienced': return 'experienced';
    case 'advanced': return 'experienced';
    default: return '';
  }
};

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { profile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [constraints, setConstraints] = useState<Partial<Record<string, RawOptionState[]>> | null>(null);
  const didInitRef = useRef(false);

  // Initialize form state ONLY when modal opens — never on external profile ref changes
  // This prevents external refreshProfile calls from overwriting in-progress edits
  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false;
      return;
    }
    if (!profile) return;
    if (didInitRef.current) {
      // Profile ref changed while modal is open — do NOT overwrite user's edits
      console.log('[CIFRAA-PREF] Profile refresh detected — skipping overwrite to preserve in-progress edits');
      return;
    }
    didInitRef.current = true;

    const horizonValue = unmapHorizon(profile.investment_horizon) || profile.investment_horizon || '';
    const experienceValue = unmapExperience(profile.experience_level) || profile.experience_level || '';
    const initial = {
      investor_stage: profile.investor_stage || '',
      primary_goal: profile.primary_goal || '',
      investment_horizon: horizonValue,
      market_reaction: profile.market_reaction || '',
      experience_level: experienceValue,
      existing_investments: profile.existing_investments || '',
      emergency_fund: profile.emergency_fund || '',
    };
    console.log('[CIFRAA-PREF] Profile loaded:', JSON.stringify({
      investor_stage: profile.investor_stage,
      primary_goal: profile.primary_goal,
      investment_horizon: profile.investment_horizon,
      market_reaction: profile.market_reaction,
      experience_level: profile.experience_level,
      existing_investments: profile.existing_investments,
      emergency_fund: profile.emergency_fund,
    }));
    console.log('[CIFRAA-PREF] Local state initialized:', JSON.stringify(initial));
    setPreferences(initial);
  }, [isOpen, profile]);

  // Recompute constraints whenever preferences change
  useEffect(() => {
    const profileState: ProfileState = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (value) profileState[key as keyof ProfileState] = value;
    }
    setConstraints(getRawFieldAvailability(profileState));
  }, [preferences]);

  const getOptionState = useCallback((fieldKey: string, optionValue: string): {
    disabled: boolean; soft: boolean; reasons: string[]
  } => {
    if (!constraints) return { disabled: false, soft: false, reasons: [] };
    const fieldConstraints = constraints[fieldKey];
    if (!fieldConstraints) return { disabled: false, soft: false, reasons: [] };
    const c = fieldConstraints.find((c) => c.value === optionValue);
    if (c) return { disabled: !c.enabled, soft: c.enabled && c.reasons.length > 0, reasons: c.reasons };
    return { disabled: false, soft: false, reasons: [] };
  }, [constraints]);

  const handleSubmit = async () => {
    console.log('[CIFRAA-PREF] Save started');
    setIsLoading(true);
    try {
      const profileState: ProfileState = {};
      for (const [key, value] of Object.entries(preferences)) {
        if (value) profileState[key as keyof ProfileState] = value;
      }
      console.log('[SAVE_VALIDATION]', {
        primaryGoal: profileState.primary_goal,
        horizon: profileState.investment_horizon,
        investorStage: profileState.investor_stage,
        preferences: profileState,
      });
      const validationErrors = validateProfile(profileState);
      if (validationErrors.length > 0) {
        toast.error('Cannot save: ' + validationErrors[0].reason);
        setIsLoading(false);
        return;
      }

      const uiValue = preferences.experience_level;
      const dbValue = mapExperience(uiValue);
      console.log('[SAVE_PAYLOAD]', {
        experience_level: dbValue,
        investment_horizon: mapHorizon(preferences.investment_horizon),
        risk_tolerance: deriveRiskFromMarketReaction(preferences.market_reaction),
      });
      console.log('[EXPERIENCE_LEVEL]', {
        uiValue,
        dbValue,
      });
      const { error } = await updateProfile({
        investor_stage: preferences.investor_stage,
        primary_goal: preferences.primary_goal,
        market_reaction: preferences.market_reaction,
        emergency_fund: preferences.emergency_fund,
        investment_horizon: mapHorizon(preferences.investment_horizon),
        experience_level: dbValue,
        existing_investments: preferences.existing_investments,
        risk_tolerance: deriveRiskFromMarketReaction(preferences.market_reaction),
        investment_goal: deriveGoalFromPrimaryGoal(preferences.primary_goal),
        investment_amount: 'medium',
      });
      if (error) {
        toast.error('Failed to save preferences: ' + error.message);
        return;
      }
      // updateProfile already calls fetchProfile internally — no need for refreshProfile here
      console.log('[CIFRAA-PREF] Save success');
      toast.success('Preferences updated! Your personalized funds will refresh.');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to update preferences: ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = useCallback((field: string, value: string) => {
    console.log('[CIFRAA-PREF] User changed:', field, '=', value);
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
          {FIELDS.map(field => (
            <PreferenceSection
              key={field.key}
              label={field.label}
              icon={field.icon}
              hint={field.hint}
            >
              <div className="grid grid-cols-1 gap-2">
                {field.options.map(opt => {
                  const optState = getOptionState(field.key, opt.value);
                  return (
                    <OptionCard
                      key={opt.value}
                      selected={preferences[field.key] === opt.value}
                      onClick={() => {
                        if (!optState.disabled) updateField(field.key, opt.value);
                      }}
                      label={opt.label}
                      desc={opt.desc}
                      disabled={optState.disabled}
                      soft={optState.soft}
                      reasons={optState.reasons}
                    />
                  );
                })}
              </div>
            </PreferenceSection>
          ))}
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
  children,
}: {
  label: string;
  icon: React.ElementType;
  hint: string;
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
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  desc,
  disabled = false,
  soft = false,
  reasons = [],
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc: string;
  disabled?: boolean;
  soft?: boolean;
  reasons?: string[];
}) {
  const card = (
    <Card
      className={cn(
        'transition-all duration-200',
        disabled && 'opacity-40',
        !disabled && 'cursor-pointer hover:border-primary/50',
        selected && 'border-primary bg-primary/5',
        soft && 'border-warning/30 bg-warning/5',
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('font-medium text-sm', selected && 'text-primary', disabled && 'text-muted-foreground')}>
              {label}
            </p>
            {soft && <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />}
          </div>
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

  if (disabled && reasons.length > 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs z-[9999]">
            {reasons[0]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (soft && reasons.length > 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs z-[9999]">
            {reasons[0]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

