import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Shield, Target, Clock, Wallet, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { AuthBackground } from '@/components/auth/AuthBackground';

interface Question {
  id: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string; description: string }[];
}

const questions: Question[] = [
  {
    id: 'risk_tolerance',
    question: 'What\'s your comfort level with risk?',
    description: 'This helps us understand what kind of investments might align with your preferences.',
    icon: Shield,
    options: [
      { value: 'conservative', label: 'Conservative', description: 'I prefer stability over high returns' },
      { value: 'moderate', label: 'Moderate', description: 'Balanced approach to risk and reward' },
      { value: 'aggressive', label: 'Aggressive', description: 'I\'m okay with volatility for higher potential' }
    ]
  },
  {
    id: 'investment_horizon',
    question: 'What\'s your investment timeline?',
    description: 'Longer horizons often allow for different strategies.',
    icon: Clock,
    options: [
      { value: 'short', label: 'Short (1-3 years)', description: 'Need funds relatively soon' },
      { value: 'medium', label: 'Medium (3-7 years)', description: 'Planning for medium-term goals' },
      { value: 'long', label: 'Long (7+ years)', description: 'Building wealth for the future' }
    ]
  },
  {
    id: 'investment_goal',
    question: 'What\'s your primary investment goal?',
    description: 'Understanding your objective helps personalize your experience.',
    icon: Target,
    options: [
      { value: 'wealth', label: 'Wealth Creation', description: 'Growing my money over time' },
      { value: 'income', label: 'Regular Income', description: 'Generating periodic returns' },
      { value: 'preservation', label: 'Capital Preservation', description: 'Protecting what I have' },
      { value: 'tax', label: 'Tax Savings', description: 'Optimizing tax efficiency' }
    ]
  },
  {
    id: 'experience_level',
    question: 'How familiar are you with mutual funds?',
    description: 'This helps us tailor the information we show you.',
    icon: TrendingUp,
    options: [
      { value: 'beginner', label: 'Beginner', description: 'Just getting started' },
      { value: 'intermediate', label: 'Intermediate', description: 'Some experience investing' },
      { value: 'advanced', label: 'Advanced', description: 'Well-versed in fund analysis' }
    ]
  },
  {
    id: 'investment_amount',
    question: 'What amount are you considering to invest?',
    description: 'This is just for personalization, not a commitment.',
    icon: Wallet,
    options: [
      { value: 'small', label: 'Under ₹50,000', description: 'Starting small' },
      { value: 'medium', label: '₹50,000 - ₹5 Lakhs', description: 'Moderate investment' },
      { value: 'large', label: '₹5 Lakhs+', description: 'Significant portfolio' }
    ]
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // If already completed onboarding, redirect to dashboard
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleSelect = async (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    
    // Start transition animation
    setIsTransitioning(true);
    
    // Wait for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (currentStep < questions.length - 1) {
      // Move to next question
      setCurrentStep(prev => prev + 1);
      setIsTransitioning(false);
    } else {
      // Complete onboarding
      await completeOnboarding(newAnswers);
    }
  };

  const completeOnboarding = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    
    try {
      const { error } = await updateProfile({
        risk_tolerance: finalAnswers.risk_tolerance,
        investment_horizon: finalAnswers.investment_horizon,
        investment_goal: finalAnswers.investment_goal,
        experience_level: finalAnswers.experience_level,
        investment_amount: finalAnswers.investment_amount,
        onboarding_completed: true,
      });

      if (error) throw error;

      toast.success('Profile complete! Taking you to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save your preferences. Please try again.');
      setIsTransitioning(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/auth');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const IconComponent = currentQuestion.icon;

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Premium fintech background - shared with Auth */}
      <AuthBackground />
      
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden z-10">
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight">
                Let's <span className="text-primary">Personalize</span>
              </h1>
              <p className="mt-4 text-xl text-muted-foreground max-w-md">
                Answer a few quick questions so we can recommend the best mutual funds for your goals.
              </p>
            </div>

            {/* Progress indicators on left side */}
            <div className="space-y-3 pt-8">
              {questions.map((q, idx) => (
                <div 
                  key={q.id} 
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                    idx === currentStep 
                      ? 'bg-primary/10 border border-primary/30' 
                      : idx < currentStep 
                        ? 'bg-secondary/20 opacity-70' 
                        : 'opacity-30'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    idx < currentStep 
                      ? 'bg-primary text-primary-foreground' 
                      : idx === currentStep 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-secondary/50 text-muted-foreground'
                  }`}>
                    {idx < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <q.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${idx === currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {q.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fun fact or tip */}
            <div className="pt-8 flex items-start gap-3 max-w-sm p-4 rounded-xl bg-secondary/20 backdrop-blur-sm border border-border/20">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Did you know?</p>
                <p className="text-sm text-muted-foreground">
                  Personalized recommendations can improve your investment outcomes by matching funds to your unique profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Question Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        {/* Header for mobile and desktop */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="gap-2 text-muted-foreground hover:text-foreground"
            disabled={isSaving}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <FundexLogo size="sm" />
          <div className="w-20" /> {/* Spacer for layout balance */}
        </div>

        <div className="w-full max-w-lg mt-16 lg:mt-0">
          {/* Elegant progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground font-medium">Step {currentStep + 1} of {questions.length}</span>
              <span className="text-primary font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
              <div 
                className="absolute inset-0 h-full rounded-full opacity-50"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, transparent, hsla(217, 91%, 60%, 0.3), transparent)',
                }}
              />
            </div>
          </div>

          {/* Question Card */}
          <Card 
            className={`auth-card auth-card-glow transition-all duration-300 ${
              isTransitioning ? 'opacity-80 scale-[0.98]' : 'opacity-100 scale-100'
            }`}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4 lg:hidden">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <IconComponent className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl lg:text-2xl tracking-tight">{currentQuestion.question}</CardTitle>
              <CardDescription className="text-base">
                {currentQuestion.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  disabled={isSaving}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${
                    answers[currentQuestion.id] === option.value
                      ? 'onboarding-option-selected'
                      : 'onboarding-option'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {answers[currentQuestion.id] === option.value && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-4">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {isSaving && (
                <div className="flex items-center justify-center gap-2 pt-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Saving your preferences...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step indicators (mobile only) */}
          <div className="flex justify-center gap-2 mt-6 lg:hidden">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-8 bg-primary' 
                    : idx < currentStep 
                      ? 'w-2 bg-primary/50' 
                      : 'w-2 bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
