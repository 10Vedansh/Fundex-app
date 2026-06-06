import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinEntryProps {
  mode: 'create' | 'confirm' | 'verify';
  onSubmit: (pin: string) => Promise<void>;
  onSkip?: () => void;
  isLoading?: boolean;
  error?: string;
}

export function PinEntry({ mode, onSubmit, onSkip, isLoading, error }: PinEntryProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [localError, setLocalError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const setter = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmInputsRef : inputsRef;

    setter(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const refs = isConfirm ? confirmInputsRef : inputsRef;
    const currentPin = isConfirm ? confirmPin : pin;
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    const pinStr = pin.join('');
    if (pinStr.length === 4) {
      if (mode === 'verify') {
        onSubmit(pinStr);
      } else if (mode === 'create' && step === 'enter') {
        setStep('confirm');
        setTimeout(() => confirmInputsRef.current[0]?.focus(), 100);
      }
    }
  }, [pin]);

  useEffect(() => {
    const confirmStr = confirmPin.join('');
    if (confirmStr.length === 4 && step === 'confirm') {
      const pinStr = pin.join('');
      if (confirmStr === pinStr) {
        setLocalError('');
        onSubmit(pinStr);
      } else {
        setLocalError('PINs don\'t match. Try again.');
        setConfirmPin(['', '', '', '']);
        setTimeout(() => confirmInputsRef.current[0]?.focus(), 100);
      }
    }
  }, [confirmPin]);

  const title = mode === 'verify' 
    ? 'Enter Your PIN' 
    : step === 'enter' 
      ? 'Create Your PIN' 
      : 'Confirm Your PIN';

  const subtitle = mode === 'verify'
    ? 'Enter your 4-digit security PIN to continue'
    : step === 'enter'
      ? 'Set a 4-digit PIN for quick & secure access'
      : 'Re-enter your PIN to confirm';

  const currentPin = step === 'confirm' ? confirmPin : pin;
  const currentRefs = step === 'confirm' ? confirmInputsRef : inputsRef;
  const isConfirmStep = step === 'confirm';

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center">
      <div className="w-full max-w-sm px-6 text-center space-y-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-3xl bg-primary/15 flex items-center justify-center">
            <Lock className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        </div>

        <div className="flex justify-center gap-4">
          {currentPin.map((digit, i) => (
            <input
              key={`${isConfirmStep ? 'c' : 'e'}-${i}`}
              ref={el => { currentRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value, isConfirmStep)}
              onKeyDown={(e) => handleKeyDown(i, e, isConfirmStep)}
              disabled={isLoading}
              className={cn(
                'w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-secondary/50 text-foreground',
                'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30',
                'transition-all duration-200',
                digit ? 'border-primary/50' : 'border-border/50',
                displayError && 'border-destructive/50 animate-shake'
              )}
            />
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verifying...</span>
          </div>
        )}

        {displayError && (
          <p className="text-sm text-destructive animate-fade-in">{displayError}</p>
        )}

        {mode === 'create' && onSkip && step === 'enter' && (
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}
