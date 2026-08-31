export type PaymentMethod = "fpx" | "card" | "ewallet" | "mock";

export type PaymentStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export interface Payment {
  id: string;
  bookingId: string;
  provider: string;
  providerRef: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  hint: string;
}[] = [
  { value: "fpx", label: "FPX online banking", hint: "Maybank, CIMB, Public Bank…" },
  { value: "card", label: "Credit / debit card", hint: "Visa, Mastercard" },
  { value: "ewallet", label: "E-wallet", hint: "GrabPay, Touch 'n Go" },
];
