import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, Shield, Zap, Globe, Loader2 } from 'lucide-react';
import { AccessRequestModal } from './AccessRequestModal';
import { SetPasswordModal } from './SetPasswordModal';

export function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [passwordEmail, setPasswordEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get('set_password') === '1';
    const paramEmail = params.get('email') || '';
    if (shouldOpen) {
      setPasswordEmail(paramEmail);
      setShowSetPasswordModal(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password, rememberMe);
    
    if (result.success) {
      toast({
        title: "Login Successful",
        description: result.message,
      });
    } else {
      toast({
        title: "Login Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary to-primary-hover gov-pattern">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary-hover/95" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-primary-foreground/15 rounded-full flex items-center justify-center text-2xl">
              🏛️
            </div>
            <span className="text-lg font-medium opacity-90">Government of India</span>
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            NagrikGPT
          </h1>
          <p className="text-xl opacity-90 mb-12">
            Empowering Governance Through AI
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-lg font-medium">Secure & Private</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-lg font-medium">Fast & Efficient</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-lg font-medium">Nationwide Coverage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 bg-card max-w-xl mx-auto w-full">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-10">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <span className="text-3xl">🏛️</span>
              <span className="text-xl font-bold text-primary">NagrikGPT</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your government account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Official Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@nagarpalika.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Use your official government email address</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline font-medium"
                  onClick={() => { setPasswordEmail(email); setShowSetPasswordModal(true); }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Keep me signed in
              </Label>
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                onClick={() => setShowAccessModal(true)} 
                className="text-primary font-medium hover:underline"
              >
                Request access
              </button>
            </p>
          </div>

          <div className="flex justify-center gap-6 mt-8">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-success" />
              Secure Login
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-success" />
              Encrypted
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
            <p>© 2025 NagrikGPT. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-2">
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-primary">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-primary">Help Center</a>
            </div>
          </div>

          {/* Demo Credentials Notice */}
          <div className="mt-6 p-4 bg-info-light rounded-lg border border-info/20">
            <p className="text-sm text-info font-medium mb-1">Demo Credentials</p>
            <p className="text-xs text-muted-foreground">
              Email: sneha.kulkarni@nagarpalika.gov.in<br />
              Password: sneha12345
            </p>
          </div>
        </div>
      </div>

      <AccessRequestModal open={showAccessModal} onOpenChange={setShowAccessModal} />
      <SetPasswordModal open={showSetPasswordModal} onOpenChange={setShowSetPasswordModal} defaultEmail={passwordEmail} />
    </div>
  );
}
