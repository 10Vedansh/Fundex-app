import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Check, Shield, Target, Clock, TrendingUp, Wallet, PiggyBank, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { getRawFieldAvailability, validateProfile, ProfileState } from '@/utils/recommendation/profileRules';

interface Question {
  id: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string; description: string }[];
}

const ALL_QUESTIONS: Question[] = [
  {
    id: 'investor_stage', question: 'Which best describes you?', description: 'Your current life stage helps us tailor recommendations.',
    icon: Shield, options: [
      { value: 'student', label: 'Student', description: 'Pursuing education with limited income' },
      { value: 'early_career', label: 'Early Career Professional', description: 'Building my career and financial foundation' },
      { value: 'mid_career', label: 'Mid-Career Professional', description: 'Established career with growing responsibilities' },
      { value: 'business_owner', label: 'Business Owner', description: 'Running my own business or venture' },
      { value: 'retired', label: 'Retired', description: 'Enjoying retirement with steady income needs' },
    ]
  },
  {
    id: 'primary_goal', question: "What's your primary investment goal?", description: 'Understanding your objective helps personalize your experience.',
    icon: Target, options: [
      { value: 'wealth_creation', label: 'Long-Term Wealth Creation', description: 'Growing my money substantially over time' },
      { value: 'retirement', label: 'Retirement Planning', description: 'Building a corpus for retirement' },
      { value: 'child_education', label: 'Child Education / Family Goals', description: 'Saving for education or family milestones' },
      { value: 'passive_income', label: 'Regular Passive Income', description: 'Generating consistent returns' },
      { value: 'tax_saving', label: 'Tax Saving', description: 'Optimizing tax efficiency' },
      { value: 'capital_preservation', label: 'Capital Preservation', description: 'Protecting what I have' },
    ]
  },
  {
    id: 'investment_horizon', question: "What's your investment horizon?", description: 'Longer horizons often allow for different strategies.',
    icon: Clock, options: [
      { value: '<3', label: 'Less than 3 Years', description: 'Need funds relatively soon' },
      { value: '3-5', label: '3-5 Years', description: 'Medium-term financial goals' },
      { value: '5-10', label: '5-10 Years', description: 'Long-term growth horizon' },
      { value: '>10', label: 'More than 10 Years', description: 'Very long-term wealth building' },
    ]
  },
  {
    id: 'market_reaction', question: 'If your ₹1,00,000 investment temporarily fell to ₹75,000, what would you most likely do?', description: 'This helps gauge your risk comfort level.',
    icon: TrendingUp, options: [
      { value: 'withdraw', label: 'Withdraw immediately', description: 'Cut losses and move to safer options' },
      { value: 'wait', label: 'Wait for recovery', description: 'Stay invested and monitor performance' },
      { value: 'invest_more', label: 'Invest more at lower prices', description: 'See it as a buying opportunity' },
    ]
  },
  {
    id: 'experience_level', question: 'How would you describe your investment experience?', description: 'Helps us tailor the information we show you.',
    icon: AlertTriangle, options: [
      { value: 'first_time', label: 'First-Time Investor', description: 'Just getting started with investing' },
      { value: 'some_experience', label: 'Some Investing Experience', description: 'Have invested in funds before' },
      { value: 'experienced', label: 'Experienced Investor', description: 'Well-versed in fund analysis and markets' },
    ]
  },
  {
    id: 'existing_investments', question: 'What is the total value of your existing investments?', description: 'This helps us understand your financial picture.',
    icon: Wallet, options: [
      { value: 'none', label: 'No Existing Investments', description: 'Starting from scratch' },
      { value: 'under_5l', label: 'Under ₹5L', description: 'Early stage of investment journey' },
      { value: '5l_25l', label: '₹5L - ₹25L', description: 'Building a meaningful portfolio' },
      { value: '25l_plus', label: '₹25L+', description: 'Significant investment portfolio' },
    ]
  },
  {
    id: 'emergency_fund', question: 'How many months of expenses do you have saved as an emergency fund?', description: 'Emergency savings affect investment risk capacity.',
    icon: PiggyBank, options: [
      { value: '<3_months', label: 'Less than 3 Months', description: 'Minimal emergency buffer' },
      { value: '3_6_months', label: '3-6 Months Expenses', description: 'Moderate safety net' },
      { value: '>6_months', label: 'More than 6 Months', description: 'Strong financial cushion' },
    ]
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showWarning, setShowWarning] = useState<string | null>(null);

  const questions = ALL_QUESTIONS;
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (profile?.onboarding_completed) navigate('/dashboard'); }, [profile, navigate]);

  // Compute constraint-driven option availability from current answers
  const rawAvailability = useMemo(() => {
    const profileState: ProfileState = {};
    for (const [key, value] of Object.entries(answers)) {
      if (value) profileState[key as keyof ProfileState] = value;
    }
    return getRawFieldAvailability(profileState);
  }, [answers]);

  const isOptionDisabled = (fieldKey: string, optionValue: string): { disabled: boolean; reason: string } => {
    const fa = rawAvailability[fieldKey as keyof ProfileState];
    if (!fa) return { disabled: false, reason: '' };
    const match = fa.find((o) => o.value === optionValue);
    if (match && !match.enabled) return { disabled: true, reason: match.reasons[0] || '' };
    return { disabled: false, reason: '' };
  };

  const handleSelect = async (value: string) => {
    const { disabled, reason } = isOptionDisabled(currentQuestion.id, value);
    if (disabled) {
      setShowWarning(reason);
      return;
    }
    if (showWarning) { setShowWarning(null); }
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    if (currentStep < questions.length - 1) { setCurrentStep(prev => prev + 1); setIsTransitioning(false); }
    else await completeOnboarding(newAnswers);
  };

  const deriveRiskFromMarketReaction = (reaction: string): string => {
    switch (reaction) {
      case 'withdraw': return 'conservative';
      case 'wait': return 'moderate';
      case 'invest_more': return 'aggressive';
      default: return 'moderate';
    }
  };

  const deriveGoalFromPrimaryGoal = (goal: string): string => {
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

  const mapHorizon = (horizon: string): string => {
    switch (horizon) {
      case '<3': return 'short';
      case '3-5': return 'medium';
      case '5-10': return 'medium';
      case '>10': return 'long';
      default: return 'medium';
    }
  };

  const mapExperience = (exp: string): string => {
    switch (exp) {
      case 'first_time': return 'beginner';
      case 'some_experience': return 'intermediate';
      case 'experienced': return 'advanced';
      default: return 'beginner';
    }
  };

  const completeOnboarding = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    try {
      const profileState: ProfileState = {};
      for (const [key, value] of Object.entries(finalAnswers)) {
        if (value) profileState[key as keyof ProfileState] = value;
      }
      const validationErrors = validateProfile(profileState);
      if (validationErrors.length > 0) {
        toast.error('Invalid profile: ' + validationErrors[0].reason);
        setIsTransitioning(false);
        setIsSaving(false);
        return;
      }

      const uiValue = finalAnswers.experience_level;
      const dbValue = mapExperience(uiValue);
      console.log('[SAVE_PAYLOAD]', {
        experience_level: dbValue,
        investment_horizon: mapHorizon(finalAnswers.investment_horizon),
        risk_tolerance: deriveRiskFromMarketReaction(finalAnswers.market_reaction),
      });
      console.log('[EXPERIENCE_LEVEL]', {
        uiValue,
        dbValue,
      });
      const { error } = await updateProfile({
        investor_stage: finalAnswers.investor_stage,
        primary_goal: finalAnswers.primary_goal,
        market_reaction: finalAnswers.market_reaction,
        emergency_fund: finalAnswers.emergency_fund,
        investment_horizon: mapHorizon(finalAnswers.investment_horizon),
        experience_level: dbValue,
        existing_investments: finalAnswers.existing_investments,
        risk_tolerance: deriveRiskFromMarketReaction(finalAnswers.market_reaction),
        investment_goal: deriveGoalFromPrimaryGoal(finalAnswers.primary_goal),
        investment_amount: 'medium',
        onboarding_completed: true,
      });
      if (error) throw error;
      toast.success('Profile complete! Taking you to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save your preferences. Please try again.');
      setIsTransitioning(false);
    } finally { setIsSaving(false); }
  };

  const handleBack = async () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      await signOut();
      navigate('/auth', { replace: true });
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const IconComponent = currentQuestion.icon;

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col min-h-screen px-8 py-8 sm:px-12 lg:px-16 xl:px-20">
          <div className="flex items-center justify-between">
            <FundexLogo size="sm" />
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSaving} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground font-medium">Step {currentStep + 1} of {questions.length}</span>
                  <span className="text-primary font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {showWarning && (
                <div className="mb-4 p-3 rounded-xl bg-warning/15 border border-warning/30 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Doesn't match your profile</p>
                    <p className="text-xs text-muted-foreground mt-1">{showWarning}</p>
                  </div>
                </div>
              )}

              <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-80 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{currentQuestion.question}</h1>
                </div>
                <p className="text-muted-foreground text-sm mb-6 ml-[52px]">{currentQuestion.description}</p>

                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const { disabled: optDisabled, reason: optReason } = isOptionDisabled(currentQuestion.id, option.value);
                    const btn = (
                      <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        disabled={isSaving}
                        className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                          answers[currentQuestion.id] === option.value
                            ? 'bg-primary/10 border-primary/50 shadow-[0_0_0_1px_hsla(217,91%,60%,0.2),0_4px_20px_-4px_hsla(217,91%,60%,0.2)]'
                            : optDisabled
                              ? 'bg-secondary/10 border-border/10 opacity-40'
                              : 'bg-secondary/30 border-border/20 hover:bg-secondary/50 hover:border-primary/30 cursor-pointer'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold ${optDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {option.label}
                            </p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          {answers[currentQuestion.id] === option.value && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-4">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                    return optDisabled && optReason ? (
                      <TooltipProvider delayDuration={200} key={option.value}>
                        <Tooltip>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[260px] text-xs z-[9999]">
                            {optReason}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : btn;
                  })}
                </div>

                {isSaving && (
                  <div className="flex items-center justify-center gap-2 pt-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Saving your preferences...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-2 mt-8 lg:hidden">
                {questions.map((_, idx) => (
                  <div key={idx} className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-8 bg-primary' : idx < currentStep ? 'w-2 bg-primary/50' : 'w-2 bg-secondary'
                  }`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthBrandPanel
        title="Let's Personalize"
        subtitle="Answer a few quick questions so we can recommend the best mutual funds for your goals and risk appetite."
        footerText="Personalized recommendations improve investment outcomes by matching funds to your unique profile."
      />
    </div>
  );
}