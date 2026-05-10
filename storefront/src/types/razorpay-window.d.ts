export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  amount?: number;
  currency: string;
  name?: string;
  description?: string;
  order_id?: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
  prefill?: { email?: string; contact?: string; name?: string };
};

export type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: (payload?: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
