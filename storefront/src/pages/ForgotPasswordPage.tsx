import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorefrontGraphQLError } from '@/lib/graphql/client';
import { toast } from '@/hooks/use-toast';
import { requestPasswordReset } from '@/lib/graphql/storefront';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      const message =
        err instanceof StorefrontGraphQLError ? err.message : err instanceof Error ? err.message : 'Request failed';
      toast({ title: 'Could not send reset email', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="container max-w-md py-12 md:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          If an account exists for <strong>{email}</strong>, we've sent a password reset link. It expires in 1 hour.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-12 md:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Enter your email and we'll send you a link to reset your password.{' '}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  );
}
