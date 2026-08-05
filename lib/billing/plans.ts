import type { BillingPlan, BillingPlanId, BillingUsageMetric } from "./types";

export const billingPlans: Record<BillingPlanId, BillingPlan> = {
  free: {
    id: "free",
    name: "Free",
    imageLimit: 20,
    videoLimit: 5,
    advisorLimit: 5,
    profileLimit: 1,
    teamMemberLimit: 1,
    features: ["Ayda 20 AI görsel", "Ayda 5 AI video", "Temel Marketing Advisor", "1 marka profili"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    imageLimit: null,
    videoLimit: 100,
    advisorLimit: 100,
    profileLimit: 1,
    teamMemberLimit: 3,
    features: ["Sınırsız AI görsel", "Ayda 100 AI video", "Tam Marketing Advisor", "Takvim ve otomatik paylaşım", "Analytics", "Öncelikli üretim"],
  },
  business: {
    id: "business",
    name: "Business",
    imageLimit: null,
    videoLimit: null,
    advisorLimit: null,
    profileLimit: null,
    teamMemberLimit: 10,
    features: ["Her şey sınırsız", "Takım çalışma alanı", "Çoklu marka profili", "API erişimi", "Öncelikli destek"],
  },
};

export const paidPlanIds: BillingPlanId[] = ["pro", "business"];

export function isPlanId(value: unknown): value is BillingPlanId {
  return value === "free" || value === "pro" || value === "business";
}

export function usageLimit(plan: BillingPlan, metric: BillingUsageMetric) {
  if (metric === "ai_images") return plan.imageLimit;
  if (metric === "ai_videos") return plan.videoLimit;
  return plan.advisorLimit;
}

export function hasBillingFeature(plan: BillingPlanId, feature: "calendar" | "analytics" | "full_advisor" | "team" | "api") {
  if (feature === "team" || feature === "api") return plan === "business";
  return plan === "pro" || plan === "business";
}
