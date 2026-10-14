import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhookSignature } from "./elgiopay.js";

const secret = "whsec_test";
const body = JSON.stringify({ id: "evt_1", event: "payment.completed" });

describe("ElgioPay webhook signature", () => {
  it("accepts a valid signature", () => {
    expect(
      verifyWebhookSignature(body, signWebhook(body, secret), secret),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyWebhookSignature(`${body} `, signWebhook(body, secret), secret),
    ).toBe(false);
  });

  it("rejects another secret", () => {
    expect(
      verifyWebhookSignature(body, signWebhook(body, "whsec_other"), secret),
    ).toBe(false);
  });

  it("rejects replays older than 5 minutes", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signWebhook(body, secret, now - 301);
    expect(verifyWebhookSignature(body, header, secret, now)).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "garbage", secret)).toBe(false);
  });
});
