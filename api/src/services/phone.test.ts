import { describe, expect, it } from "vitest";
import {
  isCameroonMobile,
  normalizePhone,
  toCameroonNational,
} from "./phone.js";

describe("phone numbers", () => {
  it("accepts Cameroonian numbers with or without the country code", () => {
    expect(normalizePhone("650 911 804")).toBe("+237650911804");
    expect(normalizePhone("+237 6 50 91 18 04")).toBe("+237650911804");
    expect(normalizePhone("00237650911804")).toBe("+237650911804");
  });

  it("keeps international numbers", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("rejects garbage", () => {
    expect(normalizePhone("hello")).toBeNull();
    expect(normalizePhone("12")).toBeNull();
  });

  it("knows which numbers mobile money can charge", () => {
    expect(isCameroonMobile("+237650911804")).toBe(true);
    expect(isCameroonMobile("+33612345678")).toBe(false);
    expect(toCameroonNational("+237677000000")).toBe("677000000");
  });
});
