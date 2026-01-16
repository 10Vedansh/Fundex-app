import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Shield, Target, Zap, Clock, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string; description: string }[];
}

const questions: Question[] = [
  {
    id: 'risk',
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
    id: 'horizon',
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
    id: 'goal',
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
    id: 'experience',
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
    id: 'amount',
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
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      toast.error('Please select an option');
      return;
    }
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      toast.success('Profile complete! Taking you to your dashboard...');
      setTimeout(() => navigate('/dashboard'), 1000);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/auth');
    }
  };

  const handleSkip = () => {
    toast.info('You can complete your profile later');
    navigate('/dashboard');
  };

  const IconComponent = currentQuestion.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-xl mx-auto px-4 z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step {currentStep + 1} of {questions.length}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="glass-card border-border/50 shadow-2xl animate-fade-in" key={currentStep}>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <IconComponent className="h-7 w-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
            <CardDescription className="text-base">
              {currentQuestion.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  answers[currentQuestion.id] === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border/50 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {answers[currentQuestion.id] === option.value && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            ))}

            <Button 
              onClick={handleNext}
              className="w-full mt-6 gap-2"
              size="lg"
              disabled={!answers[currentQuestion.id]}
            >
              {currentStep === questions.length - 1 ? 'Complete Profile' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
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
  );
}
