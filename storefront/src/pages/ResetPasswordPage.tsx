import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorefrontGraphQLError } from '@/lib/graphql/client';
import { toast } from '@/hooks/use-toast';
import { resetPassword } from '@/lib/graphql/storefront';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="container max-w-md py-12 md:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          This password reset link is missing or malformed.{' '}
          <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/login', { replace: true });
    } catch (err) {
      const message =
        err instanceof StorefrontGraphQLError ? err.message : err instanceof Error ? err.message : 'Reset failed';
      toast({ title: 'Could not reset password', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md py-12 md:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Enter a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
    </div>
  );
}
