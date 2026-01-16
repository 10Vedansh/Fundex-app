import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Chrome, ArrowLeft, Mail, Lock, User } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // Placeholder for Google OAuth
    toast.info('Google authentication coming soon!');
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    // Placeholder for email login
    toast.success('Login successful!');
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    // Placeholder for email signup
    toast.success('Account created! Redirecting to questionnaire...');
    setTimeout(() => {
      setIsLoading(false);
      navigate('/onboarding');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md mx-auto px-4 z-10">
        {/* Back to Home */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card className="glass-card border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-xl">F</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to Fundex</CardTitle>
            <CardDescription>
              Sign in to access your personalized dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google OAuth Button */}
            <Button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full gap-3 bg-white hover:bg-gray-100 text-gray-900 border border-gray-200"
              size="lg"
            >
              <Chrome className="h-5 w-5" />
              Continue with Google
            </Button>

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
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
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
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
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
  );
}
