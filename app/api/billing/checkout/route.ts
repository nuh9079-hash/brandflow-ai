import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripeCustomerId, getUserBillingPlan, saveStripeCustomer } from "@/lib/billing/server";
import { paidPlanIds } from "@/lib/billing/plans";
import { requireStripe, stripePriceId } from "@/lib/billing/stripe";
import type { BillingInterval, BillingPlanId } from "@/lib/billing/types";

function errorResponse(error: unknown, status = 500) {
  console.error("Stripe Checkout Error:", error);
  const message = error instanceof Error ? error.message : "Stripe Checkout başlatılamadı.";
  return Response.json({ error: message.includes("STRIPE_") ? message : "Ödeme sayfası şu anda açılamadı. Lütfen tekrar dene." }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Plan seçmek için giriş yapmalısın." }, { status: 401 });

  try {
    const body = (await request.json()) as { plan?: BillingPlanId; interval?: BillingInterval };
    if (!body.plan || !paidPlanIds.includes(body.plan) || (body.interval !== "monthly" && body.interval !== "yearly")) {
      return Response.json({ error: "Geçerli bir plan ve ödeme dönemi seç." }, { status: 400 });
    }
    const stripe = requireStripe();
    const priceId = stripePriceId(body.plan, body.interval);
    if (!priceId) return Response.json({ error: `Seçilen plan için STRIPE_${body.plan.toUpperCase()}_${body.interval.toUpperCase()}_PRICE_ID eksik.` }, { status: 503 });

    const current = await getUserBillingPlan(userId);
    if (current.subscription.plan !== "free") {
      return Response.json({ error: "Mevcut aboneliğini yükseltmek veya düşürmek için müşteri portalını kullan." }, { status: 409 });
    }

    let customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      const user = await currentUser();
      const customer = await stripe.customers.create({
        email: user?.primaryEmailAddress?.emailAddress,
        name: user?.fullName || undefined,
        metadata: { clerkUserId: userId },
      });
      customerId = customer.id;
      if (!(await saveStripeCustomer(userId, customerId))) throw new Error("Stripe müşteri kaydı veritabanına yazılamadı.");
    }

    const existingSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const duplicate = existingSubscriptions.data.find((subscription) => !["canceled", "incomplete_expired"].includes(subscription.status));
    if (duplicate) {
      return Response.json({ error: "Bu Stripe müşterisinin zaten bir aboneliği var. Yeni abonelik oluşturulmadı." }, { status: 409 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const trialDays = Number(process.env.STRIPE_TRIAL_PERIOD_DAYS || 0);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { clerkUserId: userId, plan: body.plan, interval: body.interval },
        ...(Number.isInteger(trialDays) && trialDays > 0 && trialDays <= 730
          ? { trial_period_days: trialDays, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } }
          : {}),
      },
      metadata: { clerkUserId: userId, plan: body.plan, interval: body.interval },
    });
    if (!session.url) throw new Error("Stripe ödeme bağlantısı döndürmedi.");
    return Response.json({ url: session.url });
  } catch (error) {
    return errorResponse(error, error instanceof SyntaxError ? 400 : 503);
  }
}
