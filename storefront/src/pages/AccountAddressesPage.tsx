import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  createStorefrontAddress,
  deleteStorefrontAddress,
  fetchStorefrontAddresses,
  type StorefrontAddress,
  updateStorefrontAddress,
} from '@/lib/graphql/storefront';
import { StorefrontGraphQLError } from '@/lib/graphql/client';
import { lookupIndianPincode } from '@/lib/pincodeLookup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const emptyForm: Omit<StorefrontAddress, 'id'> = {
  customerName: '',
  line1: '',
  line2: null,
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'IN',
  phone: '',
};

export default function AccountAddressesPage() {
  const { token } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addressesQuery = useQuery({
    queryKey: ['storefront-addresses', token],
    queryFn: () => fetchStorefrontAddresses(token!),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not signed in');
      if (editingId) {
        return updateStorefrontAddress(token, editingId, {
          ...form,
          line2: form.line2?.trim() ? form.line2.trim() : null,
        });
      }
      return createStorefrontAddress(token, {
        ...form,
        line2: form.line2?.trim() ? form.line2.trim() : null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['storefront-addresses'] });
      setForm(emptyForm);
      setEditingId(null);
      toast({ title: editingId ? 'Address updated' : 'Address saved' });
    },
    onError: (err) => {
      const message = err instanceof StorefrontGraphQLError ? err.message : 'Could not save address';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Not signed in');
      await deleteStorefrontAddress(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['storefront-addresses'] });
      setDeleteId(null);
      toast({ title: 'Address removed' });
    },
    onError: (err) => {
      const message = err instanceof StorefrontGraphQLError ? err.message : 'Could not delete';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    },
  });

  const startEdit = (a: StorefrontAddress) => {
    setEditingId(a.id);
    setForm({
      customerName: a.customerName,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      countryCode: a.countryCode || 'IN',
      phone: a.phone,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handlePostalCodeChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, postalCode: cleaned }));
    if (cleaned.length === 6) {
      const result = await lookupIndianPincode(cleaned);
      if (result) {
        setForm((prev) => ({ ...prev, postalCode: cleaned, city: result.city, state: result.state }));
      }
    }
  };

  if (addressesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading addresses…</p>;
  }
  if (addressesQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {addressesQuery.error instanceof Error ? addressesQuery.error.message : 'Could not load addresses'}
      </p>
    );
  }

  const list = addressesQuery.data || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Saved addresses</h2>
        <p className="text-sm text-muted-foreground">Use these at checkout when you select a saved shipping address.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">{editingId ? 'Edit address' : 'Add address'}</CardTitle>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="addr-name">Full name</Label>
              <Input
                id="addr-name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="addr-line1">Address line 1</Label>
              <Input
                id="addr-line1"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="addr-line2">Address line 2 (optional)</Label>
              <Input
                id="addr-line2"
                value={form.line2 ?? ''}
                onChange={(e) => setForm({ ...form, line2: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-pin">Postal code</Label>
              <Input
                id="addr-pin"
                inputMode="numeric"
                maxLength={6}
                value={form.postalCode}
                onChange={(e) => void handlePostalCodeChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-city">City</Label>
              <Input id="addr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-state">State</Label>
              <Input
                id="addr-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addr-phone">Phone (10 digits)</Label>
              <Input
                id="addr-phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 pt-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : editingId ? 'Update address' : 'Save address'}
              </Button>
              {!editingId && list.length > 0 && (
                <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {list.length > 0 && (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pt-6">
                  <div className="text-sm">
                    <p className="font-medium">{a.customerName}</p>
                    <p className="text-muted-foreground">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}
                    </p>
                    <p className="text-muted-foreground">
                      {a.city}, {a.state} {a.postalCode}
                    </p>
                    <p className="text-muted-foreground">{a.phone}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(a)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {list.length === 0 && !editingId && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add your first delivery address above.
        </p>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
