// Order state machine (CLAUDE.md §5). Every status change goes through `assertTransition`.

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "payment_review"
  | "paid"
  | "in_preparation"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "return_received"
  | "exchanged"
  | "refunded";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["payment_review", "paid", "cancelled"],
  payment_review: ["paid", "pending_payment", "cancelled"],
  paid: ["in_preparation", "in_production"],
  in_preparation: ["ready"],
  in_production: ["ready"],
  ready: ["shipped", "delivered"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["return_received", "delivered"],
  return_received: ["exchanged", "refunded"],
  cancelled: [],
  exchanged: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`Invalid order transition ${from} → ${to}`);
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Free cancellation is only possible before payment. */
export function isCancellableByCustomer(status: OrderStatus) {
  return status === "draft" || status === "pending_payment";
}
