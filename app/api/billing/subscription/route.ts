import { auth } from "@clerk/nextjs/server";
import { getStripeCustomerId, getStripeSubscriptionId, syncStripeSubscription } from "@/lib/billing/server";
import { paidPlanIds } from "@/lib/billing/plans";
import { billingIntervalFromPrice, planFromPriceId, requireStripe, stripePriceId } from "@/lib/billing/stripe";
import type { BillingInterval, BillingPlanId } from "@/lib/billing/types";

type ChangeBody = {
  action?: "cancel" | "reactivate" | "change-plan";
  plan?: BillingPlanId;
  interval?: BillingInterval;
  confirmed?: boolean;
};

type StripeErrorDetails = Error & {
  type?: string;
  code?: string;
  param?: string;
  raw?: {
    message?: string;
    code?: string;
    param?: string;
    request_log_url?: string;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Aboneliği yönetmek için giriş yapmalısın." }, { status: 401 });

  try {
    const body = (await request.json()) as ChangeBody;
    if (body.action !== "cancel" && body.action !== "reactivate" && body.action !== "change-plan") {
      return Response.json({ error: "Geçersiz abonelik işlemi." }, { status: 400 });
    }

    const subscriptionId = await getStripeSubscriptionId(userId);
    if (!subscriptionId) return Response.json({ error: "Aktif Stripe aboneliği bulunamadı." }, { status: 404 });
    const stripe = requireStripe();

    if (body.action === "change-plan") {
      if (!body.plan || !paidPlanIds.includes(body.plan) || (body.interval !== "monthly" && body.interval !== "yearly")) {
        return Response.json({ error: "Geçerli bir hedef plan ve ödeme dönemi seç." }, { status: 400 });
      }

      const targetPriceId = stripePriceId(body.plan, body.interval);
      if (!targetPriceId) return Response.json({ error: "Seçilen plan için Stripe Price ID yapılandırılmadı." }, { status: 503 });

      const [subscription, targetPrice, customerId] = await Promise.all([
        stripe.subscriptions.retrieve(subscriptionId),
        stripe.prices.retrieve(targetPriceId),
        getStripeCustomerId(userId),
      ]);
      const subscriptionCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      if (!customerId || subscriptionCustomerId !== customerId) {
        return Response.json({ error: "Abonelik bu kullanıcıya ait değil." }, { status: 403 });
      }
      if (billingIntervalFromPrice(targetPrice) !== body.interval) {
        return Response.json({ error: "Stripe fiyatının ödeme dönemi seçiminle eşleşmiyor." }, { status: 400 });
      }

      const mappedTarget = planFromPriceId(targetPrice.id);
      if (!mappedTarget || mappedTarget.plan !== body.plan) {
        return Response.json({ error: "Stripe fiyatı seçilen BrandFlow planıyla eşleşmiyor." }, { status: 400 });
      }

      const currentItem = subscription.items.data.find((item) => Boolean(planFromPriceId(item.price.id)));
      if (!currentItem) return Response.json({ error: "Mevcut abonelik kalemi BrandFlow planlarıyla eşleşmiyor." }, { status: 409 });
      if (currentItem.price.id === targetPrice.id) return Response.json({ error: "Bu plan ve ödeme dönemi zaten aktif." }, { status: 409 });

      const changeItems = [{ id: currentItem.id, price: targetPrice.id, quantity: currentItem.quantity ?? 1 }];
      if (body.confirmed !== true) {
        return Response.json({ error: "Plan değişikliğini onaylamalısın." }, { status: 400 });
      }

      await stripe.subscriptions.update(subscription.id, {
        items: changeItems,
        cancel_at_period_end: false,
        proration_behavior: "always_invoice",
      });
      return Response.json({ data: { changePending: true } });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: body.action === "cancel" });
    const synced = await syncStripeSubscription(subscription, userId);
    if (!synced.ok) return Response.json({ error: synced.error }, { status: synced.status });
    return Response.json({ data: { cancelAtPeriodEnd: subscription.cancel_at_period_end } });
  } catch (error) {
    const stripeError = error as StripeErrorDetails;
    console.error("Stripe Subscription Error:", error);
    console.error("Stripe error.message:", stripeError?.message);
    console.error("Stripe error.type:", stripeError?.type);
    console.error("Stripe error.code:", stripeError?.code);
    console.error("Stripe error.param:", stripeError?.param);
    console.error("Stripe error.raw:", stripeError?.raw);
    console.error("Stripe error.raw.message:", stripeError?.raw?.message);
    console.error("Stripe error.raw.code:", stripeError?.raw?.code);
    console.error("Stripe error.raw.param:", stripeError?.raw?.param);
    console.error("Stripe error.raw.request_log_url:", stripeError?.raw?.request_log_url);

    const exactStripeMessage = stripeError?.raw?.message || stripeError?.message;
    const message = process.env.NODE_ENV === "development" && exactStripeMessage
      ? exactStripeMessage
      : error instanceof Error && error.message.includes("STRIPE_")
        ? error.message
        : "Abonelik işlemi tamamlanamadı.";
    return Response.json({ error: message }, { status: 503 });
  }
}
