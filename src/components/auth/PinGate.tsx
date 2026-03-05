import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PinEntry } from '@/components/auth/PinEntry';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PIN_SESSION_KEY = 'cifraa_pin_verified';

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const { user, session, profile, refreshProfile } = useAuth();
  const [pinVerified, setPinVerified] = useState(() => {
    return sessionStorage.getItem(PIN_SESSION_KEY) === 'true';
  });
  const [showPinCreate, setShowPinCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !profile) return;
    
    if (profile.pin_set && !sessionStorage.getItem(PIN_SESSION_KEY)) {
      setPinVerified(false);
    } else if (!profile.pin_set) {
      setPinVerified(true);
    }
  }, [user, profile]);

  useEffect(() => {
    if (profile && profile.onboarding_completed && !profile.pin_set && user) {
      setShowPinCreate(true);
    }
  }, [profile, user]);

  const handleVerifyPin = async (pin: string) => {
    if (!session) return;
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-pin', {
        body: { pin },
      });

      if (fnError) throw fnError;

      if (data?.verified) {
        sessionStorage.setItem(PIN_SESSION_KEY, 'true');
        setPinVerified(true);
        toast.success('Welcome back!');
      } else if (data?.error === 'PIN not set') {
        setShowPinCreate(true);
        setPinVerified(false);
      } else {
        setError(data?.error || 'Incorrect PIN. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePin = async (pin: string) => {
    if (!session) return;
    setIsLoading(true);
    setError('');
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('set-pin', {
        body: { pin },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        await refreshProfile();
        setShowPinCreate(false);
        sessionStorage.setItem(PIN_SESSION_KEY, 'true');
        setPinVerified(true);
        toast.success('PIN created successfully!');
      } else {
        setError(data?.error || 'Failed to create PIN. Please try again.');
      }
    } catch {
      setError('Failed to create PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPin = () => {
    setShowPinCreate(false);
    sessionStorage.setItem(PIN_SESSION_KEY, 'true');
    setPinVerified(true);
  };

  if (!user || !profile) return <>{children}</>;

  if (profile.pin_set && !pinVerified) {
    return (
      <PinEntry
        mode="verify"
        onSubmit={handleVerifyPin}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (showPinCreate) {
    return (
      <>
        {children}
        <PinEntry
          mode="create"
          onSubmit={handleCreatePin}
          onSkip={handleSkipPin}
          isLoading={isLoading}
          error={error}
        />
      </>
    );
  }

  return <>{children}</>;
}
