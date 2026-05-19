import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorefrontGraphQLError } from '@/lib/graphql/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, ready } = useCustomerAuth();
  const from = (location.state as { from?: string })?.from || '/account/orders';

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && token) {
      navigate(from, { replace: true });
    }
  }, [ready, token, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({
        password,
        ...(mode === 'email' ? { email: email.trim() } : { phone: phone.replace(/\D/g, '') }),
      });
      toast({ title: 'Welcome back' });
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof StorefrontGraphQLError ? err.message : err instanceof Error ? err.message : 'Sign in failed';
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md py-12 md:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        New here?{' '}
        <Link to="/register" className="text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'email' | 'phone')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="space-y-2 mt-4">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={mode === 'email'}
            />
          </TabsContent>
          <TabsContent value="phone" className="space-y-2 mt-4">
            <Label htmlFor="login-phone">Phone (10 digits)</Label>
            <Input
              id="login-phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required={mode === 'phone'}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
