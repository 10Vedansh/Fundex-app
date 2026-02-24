import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Lock, User, Loader2, TrendingUp, Shield, Target } from 'lucide-react';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailError, setResetEmailError] = useState<string | undefined>();
  const [isResetting, setIsResetting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setErrors(prev => ({ ...prev, email: undefined }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: err.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = (value: string) => {
    try {
      passwordSchema.parse(value);
      setErrors(prev => ({ ...prev, password: undefined }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, password: err.errors[0].message }));
      }
      return false;
    }
  };

  const validateName = (value: string) => {
    try {
      nameSchema.parse(value);
      setErrors(prev => ({ ...prev, name: undefined }));
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, name: err.errors[0].message }));
      }
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || 'Failed to sign in with Google');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before logging in.');
        } else {
          toast.error(error.message || 'Failed to sign in');
        }
        return;
      }
      
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isNameValid = validateName(name);
    
    if (!isEmailValid || !isPasswordValid || !isNameValid) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUpWithEmail(email, password, name);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('An account with this email already exists. Please sign in instead.');
        } else {
          toast.error(error.message || 'Failed to create account');
        }
        return;
      }
      
      toast.success('Account created! Complete your profile...');
      navigate('/onboarding');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const validateResetEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setResetEmailError(undefined);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setResetEmailError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateResetEmail(resetEmail)) {
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await resetPassword(resetEmail);
      
      if (error) {
        toast.error(error.message || 'Failed to send reset email');
        return;
      }
      
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsResetting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Premium fintech background */}
      <AuthBackground />
      
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden z-10">
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="absolute top-8 left-8 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight">
                Dear <span className="text-primary">Investor</span>
              </h1>
              <p className="mt-4 text-xl text-muted-foreground max-w-md">
                Sign in to experience personalized mutual fund recommendations tailored to your goals.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-5 pt-8">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/20 backdrop-blur-sm border border-border/20">
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Smart Recommendations</p>
                  <p className="text-sm text-muted-foreground">AI-powered fund suggestions</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/20 backdrop-blur-sm border border-border/20">
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Risk-Aligned</p>
                  <p className="text-sm text-muted-foreground">Matches your risk appetite</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/20 backdrop-blur-sm border border-border/20">
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Goal-Focused</p>
                  <p className="text-sm text-muted-foreground">Track progress towards your targets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">

        <div className="w-full max-w-md mt-16 lg:mt-0">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome to CIFRAA</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to access your personalized dashboard
            </p>
          </div>

          <Card className="auth-card auth-card-glow">
            <CardContent className="pt-6 space-y-6">
              {/* Google OAuth Button */}
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full gap-3 bg-white hover:bg-gray-100 text-gray-900 border border-gray-200"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              {/* Social Login Buttons (Coming Soon) */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  onClick={() => toast.info('Meta login coming soon!')}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Meta
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.info('X login coming soon!')}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or continue with email
                </span>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-4">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="login-email"
                          type="email" 
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) validateEmail(e.target.value);
                          }}
                          onBlur={() => validateEmail(email)}
                          className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="login-password"
                          type="password" 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) validatePassword(e.target.value);
                          }}
                          onBlur={() => validatePassword(password)}
                          className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm text-primary"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 mt-4">
                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-name"
                          type="text" 
                          placeholder="Siddhant Negi"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) validateName(e.target.value);
                          }}
                          onBlur={() => validateName(name)}
                          className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-email"
                          type="email" 
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) validateEmail(e.target.value);
                          }}
                          onBlur={() => validateEmail(email)}
                          className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-password"
                          type="password" 
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) validatePassword(e.target.value);
                          }}
                          onBlur={() => validatePassword(password)}
                          className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="reset-email"
                  type="email" 
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (resetEmailError) validateResetEmail(e.target.value);
                  }}
                  onBlur={() => validateResetEmail(resetEmail)}
                  className={`pl-10 ${resetEmailError ? 'border-destructive' : ''}`}
                />
              </div>
              {resetEmailError && <p className="text-xs text-destructive">{resetEmailError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                  setResetEmailError(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isResetting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
