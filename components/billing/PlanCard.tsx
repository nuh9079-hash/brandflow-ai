import { Button, Card } from "@/components/ui";
import type { BillingInterval, BillingPlan, BillingPlanId, BillingPrice } from "@/lib/billing/types";

export function PlanCard({ plan, interval, price, currentPlan, busy, onSelect }: { plan: BillingPlan; interval: BillingInterval; price: BillingPrice | null; currentPlan: BillingPlanId; busy: boolean; onSelect: (plan: BillingPlanId) => void }) {
  const current = plan.id === "free" ? currentPlan === "free" : Boolean(price?.isCurrent);
  const priceLabel = price ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: price.currency.toUpperCase(), maximumFractionDigits: 0 }).format(price.amount / 100) : "Stripe’ta ayarla";
  return (
    <Card className={`flex h-full flex-col p-5 ${current ? "border-emerald-400/40" : ""}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-emerald-300">{plan.name}</p><p className={`${price ? "text-4xl" : "text-xl"} mt-3 font-black`}>{priceLabel}{price && <span className="text-sm font-medium text-zinc-500">/{interval === "monthly" ? "ay" : "yıl"}</span>}</p></div>{current && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Mevcut</span>}</div>
      <ul className="mt-5 flex-1 space-y-3 text-sm text-zinc-300">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-emerald-300">✓</span><span>{feature}</span></li>)}</ul>
      <Button type="button" className="mt-6 w-full" variant={current ? "secondary" : plan.id === "pro" ? "primary" : "secondary"} disabled={busy || current || plan.id === "free" || !price} onClick={() => onSelect(plan.id)}>
        {current ? "Mevcut plan" : plan.id === "free" ? "Ücretsiz" : currentPlan === "free" ? "Planı seç" : "Planı değiştir"}
      </Button>
    </Card>
  );
}
