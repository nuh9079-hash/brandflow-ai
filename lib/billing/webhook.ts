import type Stripe from "stripe";
import {
  hasProcessedStripeEvent,
  markStripeEvent,
  saveStripeCustomer,
  syncStripeSubscription,
} from "@/lib/billing/server";
import { requireStripe } from "@/lib/billing/stripe";

export async function handleStripeWebhook(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET yapılandırılmadı." }, { status: 503 });
  }
  if (!signature) {
    return Response.json({ error: "Stripe imzası eksik." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = requireStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Stripe Webhook Signature Error:", error);
    return Response.json({ error: "Webhook imzası doğrulanamadı." }, { status: 400 });
  }

  if (await hasProcessedStripeEvent(event.id)) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.clerkUserId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && customerId) await saveStripeCustomer(userId, customerId);
      if (session.subscription && userId) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await requireStripe().subscriptions.retrieve(subscriptionId);
        const result = await syncStripeSubscription(subscription, userId);
        if (!result.ok) throw new Error(result.error);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const result = await syncStripeSubscription(event.data.object);
      if (!result.ok) throw new Error(result.error);
    }

    if (!(await markStripeEvent(event.id, event.type))) {
      throw new Error("Webhook olayı kaydedilemedi.");
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe Webhook Processing Error:", error);
    return Response.json({ error: "Webhook işlenemedi." }, { status: 500 });
  }
}
