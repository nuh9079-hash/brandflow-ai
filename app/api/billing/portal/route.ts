import { auth } from "@clerk/nextjs/server";
import { getStripeCustomerId } from "@/lib/billing/server";
import { requireStripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Müşteri portalı için giriş yapmalısın." }, { status: 401 });
  try {
    const customerId = await getStripeCustomerId(userId);
    if (!customerId) return Response.json({ error: "Bu kullanıcı için Stripe müşteri kaydı bulunamadı." }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await requireStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/billing` });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Portal Error:", error);
    const message = error instanceof Error && error.message.includes("STRIPE_") ? error.message : "Müşteri portalı açılamadı. Stripe Portal ayarlarını kontrol et.";
    return Response.json({ error: message }, { status: 503 });
  }
}
