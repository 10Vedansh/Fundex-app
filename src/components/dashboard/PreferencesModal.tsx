import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Shield, Target, TrendingUp, Clock, Wallet, GraduationCap, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
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

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      await updateProfile(preferences);
      await refreshProfile();
      toast.success('Preferences updated! Your personalized funds will refresh.');
      onClose();
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const OptionCard = ({ 
    selected, 
    onClick, 
    label, 
    desc, 
    icon: Icon 
  }: { 
    selected: boolean; 
    onClick: () => void; 
    label: string; 
    desc: string;
    icon?: React.ElementType;
  }) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-primary/50",
        selected && "border-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {Icon && (
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            selected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm",
            selected && "text-primary"
          )}>{label}</p>
          <p className="text-xs text-muted-foreground truncate">{desc}</p>
        </div>
        <div className={cn(
          "h-4 w-4 rounded-full border-2 flex-shrink-0",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}>
          {selected && <div className="h-full w-full rounded-full flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          </div>}
        </div>
      </CardContent>
    </Card>
  );

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
          {/* Risk Tolerance */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Risk Tolerance
            </label>
            <div className="grid gap-2">
              {riskOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.risk_tolerance === opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, risk_tolerance: opt.value }))}
                  label={opt.label}
                  desc={opt.desc}
                  icon={opt.icon}
                />
              ))}
            </div>
          </div>

          {/* Investment Goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Investment Goal
            </label>
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.investment_goal === opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, investment_goal: opt.value }))}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>

          {/* Investment Horizon */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Investment Horizon
            </label>
            <div className="grid grid-cols-3 gap-2">
              {horizonOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.investment_horizon === opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, investment_horizon: opt.value }))}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {experienceOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.experience_level === opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, experience_level: opt.value }))}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>

          {/* Investment Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              Investment Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {investmentAmountOptions.map(opt => (
                <OptionCard
                  key={opt.value}
                  selected={preferences.investment_amount === opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, investment_amount: opt.value }))}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
