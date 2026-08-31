import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "@/lib/payments/mock";

const provider = new MockPaymentProvider();

const sessionInput = {
  bookingId: "bk-123",
  amount: 318,
  currency: "MYR",
  method: "fpx" as const,
  customerEmail: "jane@example.com",
  customerName: "Jane Doe",
  returnUrl: "/checkout/bk-123/result",
};

describe("MockPaymentProvider.createSession", () => {
  it("returns a redirect URL carrying the ref, amount and return path", async () => {
    const s = await provider.createSession(sessionInput);
    expect(s.provider).toBe("mock");
    expect(s.providerRef).toMatch(/^mock_/);
    const url = new URL(s.redirectUrl, "http://localhost");
    expect(url.pathname).toBe("/checkout/gateway");
    expect(url.searchParams.get("ref")).toBe(s.providerRef);
    expect(url.searchParams.get("amount")).toBe("318");
    expect(url.searchParams.get("return")).toBe(sessionInput.returnUrl);
  });
});

describe("MockPaymentProvider.verify", () => {
  it("marks an approved payment as paid with a payment id", async () => {
    const r = await provider.verify({
      ref: "mock_abc",
      outcome: "approve",
      amount: "318",
      method: "fpx",
    });
    expect(r.status).toBe("paid");
    expect(r.providerPaymentId).toMatch(/^mockpay_/);
    expect(r.amount).toBe(318);
  });

  it("marks a declined payment as failed", async () => {
    const r = await provider.verify({ ref: "mock_abc", outcome: "decline" });
    expect(r.status).toBe("failed");
    expect(r.providerPaymentId).toBeNull();
  });

  it("marks a cancelled payment as cancelled", async () => {
    const r = await provider.verify({ ref: "mock_abc", outcome: "cancel" });
    expect(r.status).toBe("cancelled");
  });

  it("defaults to cancelled when no outcome is given", async () => {
    const r = await provider.verify({ ref: "mock_abc" });
    expect(r.status).toBe("cancelled");
  });
});
