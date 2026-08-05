import type Stripe from "stripe";
import { billingPlans, hasBillingFeature, usageLimit } from "./plans";
import { billingIntervalFromPrice, getStripe, planFromPriceId, stripeConfigured, stripePriceId } from "./stripe";
import type { BillingInterval, BillingInvoice, BillingOverview, BillingPlanId, BillingPrice, BillingSubscription, BillingUsageMetric } from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type BillingResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type Row = Record<string, unknown>;
const activeStatuses = new Set(["active", "trialing", "past_due"]);

function iso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7) + "-01";
}

function normalizeSubscription(row: Row | null): BillingSubscription {
  const status = typeof row?.status === "string" ? row.status : "free";
  const priceId = typeof row?.stripe_price_id === "string" ? row.stripe_price_id : null;
  const mappedPrice = planFromPriceId(priceId);
  const plan = activeStatuses.has(status) && mappedPrice ? mappedPrice.plan : "free";
  return {
    plan,
    interval: row?.billing_interval === "monthly" || row?.billing_interval === "yearly" ? row.billing_interval : null,
    priceId,
    status,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    currentPeriodStart: typeof row?.current_period_start === "string" ? row.current_period_start : null,
    currentPeriodEnd: typeof row?.current_period_end === "string" ? row.current_period_end : null,
    trialStart: typeof row?.trial_start === "string" ? row.trial_start : null,
    trialEnd: typeof row?.trial_end === "string" ? row.trial_end : null,
  };
}

async function subscriptionRow(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("billing_subscriptions").select("*").eq("clerk_user_id", userId).maybeSingle();
  if (error) console.error("Billing subscription read failed:", error.message);
  return error ? null : (data as Row | null);
}

export async function getUserBillingPlan(userId: string) {
  const subscription = normalizeSubscription(await subscriptionRow(userId));
  return { subscription, plan: billingPlans[subscription.plan] };
}

export async function checkUsage(userId: string, metric: BillingUsageMetric): Promise<BillingResult<{ allowed: true; remaining: number | null }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Kullanım takibi için veritabanı yapılandırılmadı." };
  const { plan } = await getUserBillingPlan(userId);
  const limit = usageLimit(plan, metric);
  if (limit === null) return { ok: true, data: { allowed: true, remaining: null } };
  const { data, error } = await supabase.from("billing_usage_monthly").select("ai_images,ai_videos,advisor_analyses").eq("clerk_user_id", userId).eq("period_start", currentMonth()).maybeSingle();
  if (error) return { ok: false, status: 500, error: "Kullanım bilgisi kontrol edilemedi." };
  const used = Number((data as Row | null)?.[metric] ?? 0);
  if (used >= limit) return { ok: false, status: 402, error: "Bu ayki plan kullanım sınırına ulaştın. Devam etmek için planını yükseltebilirsin." };
  return { ok: true, data: { allowed: true, remaining: Math.max(0, limit - used) } };
}

export async function recordUsage(userId: string, metric: BillingUsageMetric, eventKey: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, status: 503, error: "Kullanım kaydedilemedi." };
  const { plan } = await getUserBillingPlan(userId);
  const { data, error } = await supabase.rpc("consume_billing_usage", {
    p_clerk_user_id: userId,
    p_metric: metric,
    p_amount: 1,
    p_limit: usageLimit(plan, metric),
    p_event_key: eventKey,
  });
  if (error || data !== true) return { ok: false as const, status: data === false ? 402 : 500, error: data === false ? "Bu ayki plan kullanım sınırına ulaştın." : "Kullanım kaydı tamamlanamadı." };
  return { ok: true as const };
}

export async function requireBillingFeature(userId: string, feature: "calendar" | "analytics" | "full_advisor" | "team" | "api") {
  const { subscription } = await getUserBillingPlan(userId);
  return hasBillingFeature(subscription.plan, feature)
    ? { ok: true as const }
    : { ok: false as const, status: 403, error: "Bu özellik Pro veya Business planında kullanılabilir." };
}

function subscriptionPeriod(item: Stripe.SubscriptionItem) {
  return { start: iso(item?.current_period_start), end: iso(item?.current_period_end) };
}

export async function userIdForStripeCustomer(customerId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("billing_customers").select("clerk_user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return typeof data?.clerk_user_id === "string" ? data.clerk_user_id : null;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, suppliedUserId?: string | null): Promise<BillingResult<null>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Abonelik veritabanı yapılandırılmadı." };
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = suppliedUserId || subscription.metadata.clerkUserId || await userIdForStripeCustomer(customerId);
  if (!userId) return { ok: false, status: 400, error: "Stripe aboneliği bir BrandFlow kullanıcısıyla eşleştirilemedi." };
  const item = subscription.items.data.find((candidate) => Boolean(planFromPriceId(candidate.price.id)));
  const mapped = planFromPriceId(item?.price.id);
  if (!mapped || !item) return { ok: false, status: 400, error: "Stripe Price ID bir BrandFlow planıyla eşleşmiyor." };
  const interval = billingIntervalFromPrice(item.price);
  if (!interval) return { ok: false, status: 400, error: "Stripe fiyatının aylık veya yıllık tekrar aralığı bulunamadı." };
  const period = subscriptionPeriod(item);
  const { error } = await supabase.from("billing_subscriptions").upsert({
    clerk_user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price.id || null,
    plan: mapped.plan,
    billing_interval: interval,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: period.start,
    current_period_end: period.end,
    trial_start: iso(subscription.trial_start),
    trial_end: iso(subscription.trial_end),
    updated_at: new Date().toISOString(),
  }, { onConflict: "clerk_user_id" });
  if (error) return { ok: false, status: 500, error: "Abonelik durumu kaydedilemedi." };
  return { ok: true, data: null };
}

async function listInvoices(customerId: string | null): Promise<BillingInvoice[]> {
  const stripe = getStripe();
  if (!stripe || !customerId) return [];
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      createdAt: new Date(invoice.created * 1000).toISOString(),
      hostedUrl: invoice.hosted_invoice_url ?? null,
    }));
  } catch (error) {
    console.error("Stripe invoice history failed:", error);
    return [];
  }
}

let priceCache: { expires: number; data: Record<BillingPlanId, Record<BillingInterval, BillingPrice | null>> } | null = null;

async function listPlanPrices() {
  if (priceCache && priceCache.expires > Date.now()) return priceCache.data;
  const data: Record<BillingPlanId, Record<BillingInterval, BillingPrice | null>> = {
    free: { monthly: { id: null, amount: 0, currency: "usd" }, yearly: { id: null, amount: 0, currency: "usd" } },
    pro: { monthly: null, yearly: null },
    business: { monthly: null, yearly: null },
  };
  const stripe = getStripe();
  if (stripe) {
    await Promise.all((["pro", "business"] as const).flatMap((plan) => (["monthly", "yearly"] as const).map(async (interval) => {
      const priceId = stripePriceId(plan, interval);
      if (!priceId) return;
      try {
        const price = await stripe.prices.retrieve(priceId);
        const actualInterval = billingIntervalFromPrice(price);
        if (price.active && price.unit_amount !== null && actualInterval === interval) data[plan][interval] = { id: price.id, amount: price.unit_amount, currency: price.currency };
      } catch (error) {
        console.error(`Stripe price read failed (${plan}/${interval}):`, error);
      }
    })));
  }
  priceCache = { expires: Date.now() + 5 * 60 * 1000, data };
  return data;
}

export async function getBillingOverview(userId: string): Promise<BillingResult<BillingOverview>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Billing veritabanı yapılandırılmadı." };
  const [subscriptionData, usageResult, customerResult] = await Promise.all([
    subscriptionRow(userId),
    supabase.from("billing_usage_monthly").select("ai_images,ai_videos,advisor_analyses").eq("clerk_user_id", userId).eq("period_start", currentMonth()).maybeSingle(),
    supabase.from("billing_customers").select("stripe_customer_id").eq("clerk_user_id", userId).maybeSingle(),
  ]);
  if (usageResult.error || customerResult.error) return { ok: false, status: 500, error: "Billing bilgileri yüklenemedi." };
  const subscription = normalizeSubscription(subscriptionData);
  const plan = billingPlans[subscription.plan];
  const usageRow = (usageResult.data as Row | null) ?? {};
  const usage = ([
    ["ai_images", "AI görseller", plan.imageLimit],
    ["ai_videos", "AI videolar", plan.videoLimit],
    ["advisor_analyses", "Advisor analizleri", plan.advisorLimit],
  ] as const).map(([metric, label, limit]) => {
    const used = Number(usageRow[metric] ?? 0);
    return { metric, label, used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
  });
  const customerId = typeof customerResult.data?.stripe_customer_id === "string" ? customerResult.data.stripe_customer_id : null;
  const [invoices, catalogPrices] = await Promise.all([listInvoices(customerId), listPlanPrices()]);
  const prices = Object.fromEntries(Object.entries(catalogPrices).map(([planId, intervals]) => [
    planId,
    Object.fromEntries(Object.entries(intervals).map(([intervalId, price]) => [intervalId, price ? { ...price, isCurrent: price.id === subscription.priceId } : null])),
  ])) as BillingOverview["prices"];
  return { ok: true, data: { plan, subscription, usage, invoices, prices, stripeConfigured: stripeConfigured(), portalAvailable: Boolean(customerId && stripeConfigured()) } };
}

export async function saveStripeCustomer(userId: string, customerId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const { error } = await supabase.from("billing_customers").upsert({ clerk_user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "clerk_user_id" });
  return !error;
}

export async function getStripeCustomerId(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("billing_customers").select("stripe_customer_id").eq("clerk_user_id", userId).maybeSingle();
  return typeof data?.stripe_customer_id === "string" ? data.stripe_customer_id : null;
}

export async function getStripeSubscriptionId(userId: string) {
  const row = await subscriptionRow(userId);
  return typeof row?.stripe_subscription_id === "string" ? row.stripe_subscription_id : null;
}

export async function markStripeEvent(eventId: string, eventType: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const { error } = await supabase.from("billing_webhook_events").insert({ stripe_event_id: eventId, event_type: eventType });
  return !error;
}

export async function hasProcessedStripeEvent(eventId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  const { count } = await supabase.from("billing_webhook_events").select("id", { count: "exact", head: true }).eq("stripe_event_id", eventId);
  return (count ?? 0) > 0;
}
