import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Mail, Lock, User, Loader2, Phone } from 'lucide-react';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, resetPassword, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailError, setResetEmailError] = useState<string | undefined>();
  const [isResetting, setIsResetting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const validateEmail = (value: string) => {
    try { emailSchema.parse(value); setErrors(prev => ({ ...prev, email: undefined })); return true; }
    catch (err) { if (err instanceof z.ZodError) setErrors(prev => ({ ...prev, email: err.errors[0].message })); return false; }
  };
  const validatePassword = (value: string) => {
    try { passwordSchema.parse(value); setErrors(prev => ({ ...prev, password: undefined })); return true; }
    catch (err) { if (err instanceof z.ZodError) setErrors(prev => ({ ...prev, password: err.errors[0].message })); return false; }
  };
  const validateName = (value: string) => {
    try { nameSchema.parse(value); setErrors(prev => ({ ...prev, name: undefined })); return true; }
    catch (err) { if (err instanceof z.ZodError) setErrors(prev => ({ ...prev, name: err.errors[0].message })); return false; }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;
    setIsLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password. Please try again.');
        else if (error.message.includes('Email not confirmed')) toast.error('Please verify your email before logging in.');
        else toast.error(error.message || 'Failed to sign in');
        return;
      }
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch { toast.error('An unexpected error occurred'); }
    finally { setIsLoading(false); }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) return;
    setIsLoading(true);
    try {
      const { error } = await signUpWithEmail(email, password, name);
      if (error) {
        if (error.message.includes('User already registered')) toast.error('An account with this email already exists.');
        else toast.error(error.message || 'Failed to create account');
        return;
      }
      toast.success('Account created! Complete your profile...');
      navigate('/onboarding');
    } catch { toast.error('An unexpected error occurred'); }
    finally { setIsLoading(false); }
  };

  const validateResetEmail = (value: string) => {
    try { emailSchema.parse(value); setResetEmailError(undefined); return true; }
    catch (err) { if (err instanceof z.ZodError) setResetEmailError(err.errors[0].message); return false; }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResetEmail(resetEmail)) return;
    setIsResetting(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) { toast.error(error.message || 'Failed to send reset email'); return; }
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch { toast.error('An unexpected error occurred'); }
    finally { setIsResetting(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMethod = activeTab === 'login' ? loginMethod : signupMethod;
  const setCurrentMethod = activeTab === 'login' ? setLoginMethod : setSignupMethod;

  return (
    <div className="min-h-screen bg-background flex">
      {/* LEFT SIDE — Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen relative">
        {/* Subtle background for form side */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col min-h-screen px-8 py-8 sm:px-12 lg:px-16 xl:px-20">
          {/* Top: Logo */}
          <div className="flex items-center justify-between">
            <FundexLogo size="sm" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Back
            </Button>
          </div>

          {/* Center: Form */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {activeTab === 'login' ? 'Sign in' : 'Create account'}
              </h1>
              <p className="text-muted-foreground text-sm mt-2 mb-8">
                {activeTab === 'login' 
                  ? 'Welcome back. Enter your credentials to continue.' 
                  : 'Get started with your personalized portfolio.'}
              </p>

              {/* Method toggle */}
              <div className="flex gap-2 p-1 rounded-lg bg-secondary/30 mb-6">
                <button
                  type="button"
                  onClick={() => setCurrentMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    currentMethod === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    currentMethod === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" /> Mobile No.
                </button>
              </div>

              {currentMethod === 'phone' ? (
                <div className="text-center py-10">
                  <Phone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Mobile {activeTab === 'login' ? 'login' : 'signup'} coming soon!</p>
                  <p className="text-xs text-muted-foreground mt-1">Please use email for now.</p>
                </div>
              ) : activeTab === 'login' ? (
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="login-email" type="email" placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errors.email) validateEmail(e.target.value); }}
                        onBlur={() => validateEmail(email)}
                        className={`pl-10 h-11 bg-secondary/30 border-border/40 ${errors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="login-password" type="password" placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (errors.password) validatePassword(e.target.value); }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-10 h-11 bg-secondary/30 border-border/40 ${errors.password ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe} 
                        onCheckedChange={(c) => setRememberMe(!!c)} 
                      />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setActiveTab('signup')} className="text-foreground font-semibold hover:underline">
                        Sign up
                      </button>
                    </p>
                    <button 
                      type="button" 
                      onClick={() => setShowForgotPassword(true)} 
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Forgot Password
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleEmailSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-name" type="text" placeholder="Your full name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (errors.name) validateName(e.target.value); }}
                        onBlur={() => validateName(name)}
                        className={`pl-10 h-11 bg-secondary/30 border-border/40 ${errors.name ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" type="email" placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (errors.email) validateEmail(e.target.value); }}
                        onBlur={() => validateEmail(email)}
                        className={`pl-10 h-11 bg-secondary/30 border-border/40 ${errors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" type="password" placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (errors.password) validatePassword(e.target.value); }}
                        onBlur={() => validatePassword(password)}
                        className={`pl-10 h-11 bg-secondary/30 border-border/40 ${errors.password ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setActiveTab('login')} className="text-foreground font-semibold hover:underline">
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {/* Social login divider */}
              <div className="relative my-6">
                <Separator className="bg-border/30" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  or continue with
                </span>
              </div>

              {/* Social buttons */}
              <div className="flex items-center justify-center gap-4">
                {[
                  { icon: <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>, label: 'Google' },
                  { icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, label: 'Meta' },
                  { icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: 'X' },
                ].map((social) => (
                  <button
                    key={social.label}
                    disabled
                    className="h-12 w-12 rounded-full border border-border/30 bg-secondary/20 flex items-center justify-center opacity-50 cursor-not-allowed hover:opacity-60 transition-opacity"
                    title={`${social.label} (coming soon)`}
                  >
                    {social.icon}
                  </button>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — Brand Panel */}
      <AuthBrandPanel />

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
                  id="reset-email" type="email" placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); if (resetEmailError) validateResetEmail(e.target.value); }}
                  onBlur={() => validateResetEmail(resetEmail)}
                  className={`pl-10 ${resetEmailError ? 'border-destructive' : ''}`}
                />
              </div>
              {resetEmailError && <p className="text-xs text-destructive">{resetEmailError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => { setShowForgotPassword(false); setResetEmail(''); setResetEmailError(undefined); }}>
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