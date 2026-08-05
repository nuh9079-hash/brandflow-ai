import Stripe from "stripe";
import type { BillingInterval, BillingPlanId } from "./types";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient ??= new Stripe(key);
  return stripeClient;
}

export function requireStripe() {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe yapılandırılmadı. STRIPE_SECRET_KEY eksik.");
  return stripe;
}

export function stripePriceId(plan: BillingPlanId, interval: BillingInterval) {
  if (plan === "free") return null;
  const key = `STRIPE_${plan.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`;
  return process.env[key] || null;
}

export function planFromPriceId(priceId: string | null | undefined): { plan: BillingPlanId; interval: BillingInterval } | null {
  if (!priceId) return null;
  for (const plan of ["pro", "business"] as const) {
    for (const interval of ["monthly", "yearly"] as const) {
      if (stripePriceId(plan, interval) === priceId) return { plan, interval };
    }
  }
  return null;
}

export function billingIntervalFromPrice(price: Stripe.Price): BillingInterval | null {
  if (price.recurring?.interval === "month") return "monthly";
  if (price.recurring?.interval === "year") return "yearly";
  return null;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
