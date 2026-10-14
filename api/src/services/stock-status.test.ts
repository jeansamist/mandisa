import { describe, expect, it } from "vitest";
import { productStatus, variantStatus } from "./stock-status.js";

const variant = (overrides: Partial<Parameters<typeof variantStatus>[0]>) => ({
  stockOnHand: 0,
  stockReserved: 0,
  lowStockThreshold: 2,
  preorderEnabled: false,
  ...overrides,
});

describe("variantStatus", () => {
  it("is in stock above the low-stock threshold", () => {
    expect(variantStatus(variant({ stockOnHand: 3 }))).toBe("inStock");
  });

  it("is low stock at or below the threshold", () => {
    expect(variantStatus(variant({ stockOnHand: 2 }))).toBe("lowStock");
  });

  it("subtracts reserved stock", () => {
    expect(variantStatus(variant({ stockOnHand: 4, stockReserved: 4 }))).toBe(
      "soldOut",
    );
  });

  it("offers pre-order when out of stock and enabled", () => {
    expect(variantStatus(variant({ preorderEnabled: true }))).toBe("preorder");
  });

  it("never goes negative when reservations exceed stock", () => {
    expect(variantStatus(variant({ stockOnHand: 1, stockReserved: 3 }))).toBe(
      "soldOut",
    );
  });
});

describe("productStatus", () => {
  it("takes the most available variant", () => {
    expect(
      productStatus([
        variant({}),
        variant({ preorderEnabled: true }),
        variant({ stockOnHand: 1 }),
      ]),
    ).toBe("lowStock");
  });

  it("is sold out without variants", () => {
    expect(productStatus([])).toBe("soldOut");
  });
});
