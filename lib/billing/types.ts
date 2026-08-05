export type BillingPlanId = "free" | "pro" | "business";
export type BillingInterval = "monthly" | "yearly";
export type BillingUsageMetric = "ai_images" | "ai_videos" | "advisor_analyses";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  imageLimit: number | null;
  videoLimit: number | null;
  advisorLimit: number | null;
  profileLimit: number | null;
  teamMemberLimit: number;
  features: string[];
};

export type BillingPrice = { id: string | null; amount: number; currency: string; isCurrent?: boolean };

export type BillingSubscription = {
  plan: BillingPlanId;
  interval: BillingInterval | null;
  priceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
};

export type UsageItem = {
  metric: BillingUsageMetric;
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string | null;
  createdAt: string;
  hostedUrl: string | null;
};

export type BillingOverview = {
  plan: BillingPlan;
  subscription: BillingSubscription;
  usage: UsageItem[];
  invoices: BillingInvoice[];
  stripeConfigured: boolean;
  portalAvailable: boolean;
  prices: Record<BillingPlanId, Record<BillingInterval, BillingPrice | null>>;
};
