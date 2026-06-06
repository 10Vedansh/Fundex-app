import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { saveQuestionnaireToLocal, loadQuestionnaireFromLocal } from '@/utils/localQuestionnaire';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  investor_stage: string | null;
  primary_goal: string | null;
  market_reaction: string | null;
  emergency_fund: string | null;
  investment_horizon: string | null;
  experience_level: string | null;
  existing_investments: string | null;
  risk_tolerance: string | null;
  investment_goal: string | null;
  investment_amount: string | null;
  onboarding_completed: boolean;
  pin_set: boolean;
  occupation: string | null;
  income_stability: string | null;
  monthly_emis: number | null;
  dependents: number | null;
  has_insurance: boolean | null;
  risk_capacity_score: number | null;
  phone_number: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('[PROFILE] userId =', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, avatar_url, investment_horizon, experience_level, existing_investments, risk_tolerance, investment_goal, investment_amount, onboarding_completed, pin_set, occupation, income_stability, monthly_emis, dependents, has_insurance, risk_capacity_score, phone_number, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[PROFILE FULL ERROR]', JSON.stringify(error, null, 2));
        throw error;
      }

      if (data) {
        console.log('[PROFILE_LOAD] from DB — investment_horizon:', data.investment_horizon, 'experience_level:', data.experience_level);
        const localData = loadQuestionnaireFromLocal(userId);
        const merged = { ...data, ...localData };
        console.log('[PROFILE_RESTORE] after merge — investment_horizon:', merged.investment_horizon, 'experience_level:', merged.experience_level);
        setProfile(merged);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return;
      }

      const metadata = userData.user.user_metadata || {};
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: userData.user.email,
          full_name: metadata.full_name || metadata.name || '',
        })
        .select('id, user_id, email, full_name, avatar_url, investment_horizon, experience_level, existing_investments, risk_tolerance, investment_goal, investment_amount, onboarding_completed, pin_set, occupation, income_stability, monthly_emis, dependents, has_insurance, risk_capacity_score, phone_number, created_at, updated_at')
        .maybeSingle();

      if (insertError) throw insertError;

      console.log('[PROFILE_LOAD] new profile created — investment_horizon:', newProfile?.investment_horizon, 'experience_level:', newProfile?.experience_level);
      const localData = loadQuestionnaireFromLocal(userId);
      const merged = { ...newProfile, ...localData };
      console.log('[PROFILE_RESTORE] after merge — investment_horizon:', merged.investment_horizon, 'experience_level:', merged.experience_level);
      setProfile(merged);
    } catch (err) {
      console.error('fetchProfile ERROR:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { lovable } = await import('@/integrations/lovable/index');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if ('error' in result && result.error) {
      return { error: result.error as Error };
    }
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/onboarding`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const QUESTIONNAIRE_FIELDS = ['investor_stage', 'primary_goal', 'market_reaction', 'emergency_fund'];
    const localFields: Record<string, string | null> = {};
    const dbFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (QUESTIONNAIRE_FIELDS.includes(key)) {
        localFields[key] = value as string | null;
      } else {
        dbFields[key] = value;
      }
    }

    // Save questionnaire fields to localStorage first (survives DB errors)
    if (Object.keys(localFields).length > 0) {
      saveQuestionnaireToLocal(user.id, localFields);
    }

    // Save DB fields to Supabase
    if (Object.keys(dbFields).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(dbFields)
        .eq('user_id', user.id);

      if (error) {
        console.error('[PROFILE_SAVE] Supabase error:', JSON.stringify(error, null, 2));
        return { error: error as Error | null };
      }
      console.log('[PROFILE_SAVE] DB fields saved:', Object.keys(dbFields).join(', '));
      if ('investment_horizon' in dbFields || 'experience_level' in dbFields) {
        console.log('[PROFILE_SAVE] investment_horizon:', dbFields.investment_horizon, 'experience_level:', dbFields.experience_level);
      }
    }

    // Refresh profile — merges localStorage questionnaire fields into DB profile
    await fetchProfile(user.id);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        updatePassword,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
