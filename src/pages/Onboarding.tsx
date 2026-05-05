import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Shield, Target, Clock, Wallet, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';

interface Question {
  id: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string; description: string }[];
}

const ALL_QUESTIONS: Question[] = [
  { id: 'risk_tolerance', question: "What's your comfort level with risk?", description: 'This helps us understand what kind of investments might align with your preferences.', icon: Shield, options: [
    { value: 'conservative', label: 'Conservative', description: 'I prefer stability over high returns' },
    { value: 'moderate', label: 'Moderate', description: 'Balanced approach to risk and reward' },
    { value: 'aggressive', label: 'Aggressive', description: "I'm okay with volatility for higher potential" }
  ]},
  { id: 'investment_goal', question: "What's your primary investment goal?", description: 'Understanding your objective helps personalize your experience.', icon: Target, options: [
    { value: 'wealth', label: 'Wealth Creation', description: 'Growing my money over time' },
    { value: 'income', label: 'Regular Income', description: 'Generating periodic returns' },
    { value: 'preservation', label: 'Capital Preservation', description: 'Protecting what I have' },
    { value: 'tax', label: 'Tax Savings', description: 'Optimizing tax efficiency' }
  ]},
  { id: 'investment_horizon', question: "What's your investment timeline?", description: 'Longer horizons often allow for different strategies.', icon: Clock, options: [
    { value: 'short', label: 'Short (1-3 years)', description: 'Need funds relatively soon' },
    { value: 'medium', label: 'Medium (3-7 years)', description: 'Planning for medium-term goals' },
    { value: 'long', label: 'Long (7+ years)', description: 'Building wealth for the future' }
  ]},
  { id: 'experience_level', question: 'How familiar are you with mutual funds?', description: 'This helps us tailor the information we show you.', icon: TrendingUp, options: [
    { value: 'beginner', label: 'Beginner', description: 'Just getting started' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience investing' },
    { value: 'advanced', label: 'Advanced', description: 'Well-versed in fund analysis' }
  ]},
  { id: 'investment_amount', question: 'What amount are you considering to invest?', description: 'This is just for personalization, not a commitment.', icon: Wallet, options: [
    { value: 'small', label: 'Under ₹50,000', description: 'Starting small' },
    { value: 'medium', label: '₹50,000 - ₹5 Lakhs', description: 'Moderate investment' },
    { value: 'large', label: '₹5 Lakhs+', description: 'Significant portfolio' }
  ]}
];

function getDisabledOptions(questionId: string, answers: Record<string, string>): Record<string, string> {
  const disabled: Record<string, string> = {};
  const risk = answers.risk_tolerance;
  const goal = answers.investment_goal;
  if (questionId === 'investment_goal' && risk) {
    if (risk === 'aggressive') { disabled['preservation'] = 'Capital preservation doesn\'t align with aggressive risk appetite'; disabled['tax'] = 'Tax saving funds are typically conservative'; }
    if (risk === 'conservative') { disabled['wealth'] = 'Wealth creation needs higher risk tolerance'; }
  }
  if (questionId === 'investment_horizon') {
    if (risk === 'aggressive') disabled['short'] = 'Aggressive investments need at least 3+ years';
    if (goal === 'wealth') disabled['short'] = 'Wealth creation works best with 3+ year horizons';
    if (risk === 'conservative' && goal === 'preservation') disabled['long'] = 'For capital preservation, shorter horizons are more suitable';
  }
  if (questionId === 'experience_level' && risk === 'aggressive') disabled['beginner'] = 'Aggressive investing requires some market experience';
  if (questionId === 'investment_amount' && risk === 'aggressive' && goal === 'wealth') disabled['small'] = 'For aggressive wealth creation, consider investing more';
  return disabled;
}

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
  const disabledOptions = useMemo(() => getDisabledOptions(currentQuestion.id, answers), [currentQuestion.id, answers]);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (profile?.onboarding_completed) navigate('/dashboard'); }, [profile, navigate]);

  const handleSelect = async (value: string) => {
    if (disabledOptions[value]) { setShowWarning(disabledOptions[value]); setTimeout(() => setShowWarning(null), 3000); return; }
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    if (currentStep < questions.length - 1) { setCurrentStep(prev => prev + 1); setIsTransitioning(false); }
    else await completeOnboarding(newAnswers);
  };

  const completeOnboarding = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        risk_tolerance: finalAnswers.risk_tolerance, investment_horizon: finalAnswers.investment_horizon,
        investment_goal: finalAnswers.investment_goal, experience_level: finalAnswers.experience_level,
        investment_amount: finalAnswers.investment_amount, onboarding_completed: true,
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
      // At step 0: sign out so the auth page doesn't auto-redirect us back to /dashboard
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
      {/* LEFT SIDE — Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col min-h-screen px-8 py-8 sm:px-12 lg:px-16 xl:px-20">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <FundexLogo size="sm" />
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSaving} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>

          {/* Center: Question */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground font-medium">Step {currentStep + 1} of {questions.length}</span>
                  <span className="text-primary font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Warning */}
              {showWarning && (
                <div className="mb-4 p-3 rounded-xl bg-warning/15 border border-warning/30 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Doesn't match your profile</p>
                    <p className="text-xs text-muted-foreground mt-1">{showWarning}</p>
                  </div>
                </div>
              )}

              {/* Question header */}
              <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-80 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{currentQuestion.question}</h1>
                </div>
                <p className="text-muted-foreground text-sm mb-6 ml-[52px]">{currentQuestion.description}</p>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const isDisabled = !!disabledOptions[option.value];
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        disabled={isSaving}
                        className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed border-border/30 bg-secondary/20'
                            : answers[currentQuestion.id] === option.value
                              ? 'bg-primary/10 border-primary/50 shadow-[0_0_0_1px_hsla(217,91%,60%,0.2),0_4px_20px_-4px_hsla(217,91%,60%,0.2)]'
                              : 'bg-secondary/30 border-border/20 hover:bg-secondary/50 hover:border-primary/30 cursor-pointer'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{option.label}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          {answers[currentQuestion.id] === option.value && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-4">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                          {isDisabled && <AlertCircle className="h-4 w-4 text-warning shrink-0 ml-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isSaving && (
                  <div className="flex items-center justify-center gap-2 pt-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Saving your preferences...</span>
                  </div>
                )}
              </div>

              {/* Step dots (mobile) */}
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

      {/* RIGHT SIDE — Brand Panel */}
      <AuthBrandPanel
        title="Let's Personalize"
        subtitle="Answer a few quick questions so we can recommend the best mutual funds for your goals and risk appetite."
        footerText="Personalized recommendations improve investment outcomes by matching funds to your unique profile."
      />
    </div>
  );
}