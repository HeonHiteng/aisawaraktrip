import type { PaymentMethod } from "@/types/payment";

export interface CreateSessionInput {
  bookingId: string;
  amount: number; // MYR
  currency: string;
  method: PaymentMethod;
  customerEmail: string;
  customerName: string;
  /** Where the gateway returns the user after paying. */
  returnUrl: string;
}

export interface PaymentSession {
  provider: string;
  providerRef: string;
  /** Where to send the user to complete payment (hosted page / redirect). */
  redirectUrl: string;
}

export interface VerifiedPayment {
  providerRef: string;
  providerPaymentId: string | null;
  status: "paid" | "failed" | "cancelled" | "pending";
  amount: number;
  method: PaymentMethod;
  raw: Record<string, unknown>;
}

/**
 * Payment gateway abstraction. Swap the implementation via PAYMENT_PROVIDER.
 * Card data NEVER touches our servers — always a hosted page / redirect.
 */
export interface PaymentProvider {
  readonly name: string;
  createSession(input: CreateSessionInput): Promise<PaymentSession>;
  /**
   * Verify a return-URL callback or webhook payload. Real providers check a
   * cryptographic signature here; the result is the source of truth for
   * flipping a booking to `confirmed` — never trust the client.
   */
  verify(params: Record<string, string>): Promise<VerifiedPayment>;
}
