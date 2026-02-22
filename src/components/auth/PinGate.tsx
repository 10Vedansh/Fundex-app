import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PinEntry } from '@/components/auth/PinEntry';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PinGateProps {
  children: React.ReactNode;
}

// Simple hash function for PIN (not cryptographic, but sufficient for client-side comparison)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'cifraa_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function PinGate({ children }: PinGateProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinCreate, setShowPinCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !profile) return;
    
    if (profile.pin_set) {
      // User has PIN, need to verify
      setPinVerified(false);
    } else {
      // No PIN set, allow through (will prompt to create after onboarding)
      setPinVerified(true);
    }
  }, [user, profile]);

  // Show PIN creation prompt after onboarding
  useEffect(() => {
    if (profile && profile.onboarding_completed && !profile.pin_set && user) {
      setShowPinCreate(true);
    }
  }, [profile, user]);

  const handleVerifyPin = async (pin: string) => {
    if (!profile) return;
    setIsLoading(true);
    setError('');
    
    try {
      const hashed = await hashPin(pin);
      if (hashed === profile.pin_hash) {
        setPinVerified(true);
        toast.success('Welcome back!');
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePin = async (pin: string) => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    
    try {
      const hashed = await hashPin(pin);
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ pin_hash: hashed, pin_set: true })
        .eq('user_id', user.id);
      
      if (dbError) throw dbError;
      
      await refreshProfile();
      setShowPinCreate(false);
      setPinVerified(true);
      toast.success('PIN created successfully!');
    } catch {
      setError('Failed to create PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPin = () => {
    setShowPinCreate(false);
    setPinVerified(true);
  };

  // Not logged in or loading
  if (!user || !profile) return <>{children}</>;

  // PIN verification required
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

  // PIN creation prompt
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
