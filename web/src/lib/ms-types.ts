// Shapes of the admin API responses (api/src/admin/*.ts).

export type AdminIdentity = { id: number; email: string; name: string };

export type StockStatus = "inStock" | "lowStock" | "preorder" | "soldOut";

export type AdminProductRow = {
  code: string;
  name: string;
  texture: "afro" | "kinkyYaki" | "lightYaki" | "curly";
  isActive: boolean;
  image: string | null;
  variantCount: number;
  priceFromXaf: number | null;
  stockOnHand: number;
  stockReserved: number;
  lowStockVariants: number;
  soldOutVariants: number;
};

export type AdminVariant = {
  id: number;
  sku: string;
  lengthInches: number;
  color: string;
  capSize: "S" | "M" | "L";
  priceXaf: number;
  stockOnHand: number;
  stockReserved: number;
  lowStockThreshold: number;
  preorderEnabled: boolean;
  available: number;
  status: StockStatus;
};

export type AdminMedia = {
  id: number;
  url: string;
  kind: "image" | "video";
  position: number;
  approved: boolean;
};

export type AdminProduct = {
  id: number;
  code: string;
  name: string;
  texture: AdminProductRow["texture"];
  descriptionFr: string;
  descriptionEn: string;
  isActive: boolean;
  variants: AdminVariant[];
  media: AdminMedia[];
};

export type DeliveryMethodRow = {
  code: string;
  feeXaf: number | null;
  allowsCashOnDelivery: boolean;
  requiresAddress: boolean;
  isActive: boolean;
  position: number;
};

export type PaymentMethodRow = {
  code:
    "mtn_momo" | "orange_money" | "bank_transfer" | "cash_on_delivery" | "card";
  provider: "elgiopay" | "manual";
  isActive: boolean;
  position: number;
};

export type CheckoutSettings = {
  deliveryMethods: DeliveryMethodRow[];
  paymentMethods: PaymentMethodRow[];
  elgiopayConfigured: boolean;
};

export type AssistantConfig = {
  enabled: boolean;
  model: string;
  effort: string;
  instructions: string;
  knowledge: string;
  greetingFr: string;
  greetingEn: string;
  enabledTools: string[];
  updatedAt: string;
};

export type AssistantConfigResponse = {
  config: AssistantConfig;
  options: { models: string[]; efforts: string[]; tools: string[] };
  apiKeyConfigured: boolean;
};

export type AiConversation = {
  id: string;
  visitorId: string | null;
  locale: string;
  status: "open" | "handed_off";
  title: string | null;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  startedAt: string;
  lastMessageAt: string;
};

export type AiConversationDetail = {
  conversation: AiConversation;
  messages: {
    id: number;
    role: "user" | "assistant";
    text: string;
    createdAt: string;
  }[];
  actions: {
    id: number;
    tool: string;
    input: unknown;
    isError: boolean;
    resultSummary: string | null;
    createdAt: string;
  }[];
};

export type ContactMessage = {
  id: number;
  name: string;
  phone: string;
  message: string;
  locale: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

export type Dashboard = {
  period: "30d";
  kpis: {
    revenueXaf: number;
    previousRevenueXaf: number;
    paidOrders: number;
    previousPaidOrders: number;
    orders: number;
    averageBasketXaf: number | null;
    visitors: number;
    previousVisitors: number;
    sessions: number;
    conversionRate: number | null;
  };
  funnel: {
    checkoutsStarted: number;
    checkoutsOrdered: number;
    checkoutsAbandoned: number;
  };
  todo: {
    paymentsToReview: number;
    quotesToSend: number;
    unpaidOrders: number;
    newMessages: number;
    aiHandoffs: number;
    lowStock: number;
  };
  daily: {
    day: string;
    revenueXaf: number;
    paidOrders: number;
    visitors: number;
  }[];
  topProducts: {
    code: string;
    name: string;
    units: number;
    revenueXaf: number;
  }[];
  lowStock: {
    sku: string;
    productCode: string;
    productName: string;
    available: number;
    threshold: number;
    preorder: boolean;
  }[];
  recent: {
    checkouts: {
      id: string;
      status: "open" | "ordered";
      last_step: string | null;
      first_name: string | null;
      items: number;
      delivery_method: string | null;
      payment_method: string | null;
      updated_at: string;
      order_number: string | null;
      order_status: string | null;
      total_xaf: number | null;
    }[];
    orders: {
      number: string;
      status: string;
      total_xaf: number | null;
      payment_method: string | null;
      delivery_method: string;
      created_at: string;
      first_name: string;
      last_name: string;
    }[];
    customers: {
      id: number;
      first_name: string;
      last_name: string;
      phone: string;
      created_at: string;
      orders: string;
      spent_xaf: string;
    }[];
    messages: {
      id: number;
      name: string;
      phone: string;
      message: string;
      status: ContactMessage["status"];
      created_at: string;
    }[];
    conversations: {
      id: string;
      title: string | null;
      status: AiConversation["status"];
      message_count: number;
      locale: string;
      last_message_at: string;
    }[];
  };
};
