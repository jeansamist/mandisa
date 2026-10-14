import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  isCancellableByCustomer,
} from "./order-status.js";

describe("order state machine", () => {
  it("follows the happy path", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "in_preparation")).toBe(true);
    expect(canTransition("ready", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("never un-pays an order", () => {
    expect(canTransition("paid", "pending_payment")).toBe(false);
    expect(canTransition("paid", "cancelled")).toBe(false);
  });

  it("only allows free cancellation before payment", () => {
    expect(isCancellableByCustomer("pending_payment")).toBe(true);
    expect(isCancellableByCustomer("paid")).toBe(false);
  });

  it("throws on invalid transitions", () => {
    expect(() => assertTransition("cancelled", "paid")).toThrow(
      /cancelled → paid/,
    );
  });
});
