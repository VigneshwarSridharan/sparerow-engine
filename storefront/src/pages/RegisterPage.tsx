import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorefrontGraphQLError } from '@/lib/graphql/client';
import { toast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, token, ready } = useCustomerAuth();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && token) {
      navigate('/account/orders', { replace: true });
    }
  }, [ready, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (!emailTrim && !phoneDigits) {
      toast({ title: 'Email or phone required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await register({
        password,
        ...(emailTrim ? { email: emailTrim } : {}),
        ...(phoneDigits ? { phone: phoneDigits } : {}),
      });
      toast({ title: 'Account created' });
      navigate('/account/orders', { replace: true });
    } catch (err) {
      const message =
        err instanceof StorefrontGraphQLError ? err.message : err instanceof Error ? err.message : 'Sign up failed';
      toast({ title: 'Could not register', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md py-12 md:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email (optional if phone provided)</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-phone">Phone — 10 digits (optional if email provided)</Label>
          <Input
            id="reg-phone"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password (min 8 characters)</Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </Button>
      </form>
    </div>
  );
}
