"use client";

import { useEffect, useState } from "react";
import { PlanCard } from "@/components/billing/PlanCard";
import { UsageProgress } from "@/components/billing/UsageProgress";
import { Button, Card } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { billingPlans } from "@/lib/billing/plans";
import type { BillingInterval, BillingOverview, BillingPlanId } from "@/lib/billing/types";

type PendingChange = {
  currentPlan: BillingPlanId;
  currentInterval: BillingInterval;
  newPlan: BillingPlanId;
  newInterval: BillingInterval;
};

type ApiResponse = { data?: BillingOverview | { changePending?: boolean }; url?: string; error?: string };

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "-";
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

async function fetchOverview() {
  const response = await fetch("/api/billing/overview");
  const json = (await response.json()) as ApiResponse;
  if (!response.ok || !json.data || !("plan" in json.data)) throw new Error(json.error || "Billing bilgileri yüklenemedi.");
  return json.data as BillingOverview;
}

export function BillingClient({ checkoutState = "" }: { checkoutState?: string }) {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => checkoutState === "success" ? "Ödeme tamamlandı. Abonelik durumu Stripe webhook'u işlendiğinde güncellenecek." : checkoutState === "cancelled" ? "Ödeme işlemi iptal edildi; planında değişiklik yapılmadı." : "");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  async function refresh() {
    try {
      setData(await fetchOverview());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Billing bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchOverview().then((overview) => { if (active) { setData(overview); setError(""); } }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Billing bilgileri yüklenemedi."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function redirect(endpoint: "/api/billing/checkout" | "/api/billing/portal", body?: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.url) throw new Error(json.error || "Stripe sayfası açılamadı.");
      window.location.assign(json.url);
    } catch (redirectError) {
      setError(redirectError instanceof Error ? redirectError.message : "Stripe sayfası açılamadı.");
      setBusy(false);
    }
  }

  function selectPlan(plan: BillingPlanId) {
    if (!data || plan === "free") return;
    if (data.plan.id === "free") {
      void redirect("/api/billing/checkout", { plan, interval });
      return;
    }
    setPendingChange({
      currentPlan: data.plan.id,
      currentInterval: data.subscription.interval || "monthly",
      newPlan: plan,
      newInterval: interval,
    });
  }

  async function confirmPlanChange() {
    if (!pendingChange) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-plan",
          plan: pendingChange.newPlan,
          interval: pendingChange.newInterval,
          confirmed: true,
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(json.error || "Plan değişikliği tamamlanamadı.");
      setPendingChange(null);
      setNotice("Plan değişikliği Stripe tarafından kabul edildi. Doğrulanmış webhook işlendiğinde plan bilgisi güncellenecek.");
      window.setTimeout(() => { void refresh(); }, 1500);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Plan değişikliği tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function updateCancellation(action: "cancel" | "reactivate") {
    if (action === "cancel" && !window.confirm("Aboneliğin dönem sonunda iptal edilsin mi? O tarihe kadar planını kullanmaya devam edebilirsin.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(json.error || "Abonelik güncellenemedi.");
      setNotice(action === "cancel" ? "Abonelik dönem sonunda iptal edilecek." : "Aboneliğin yeniden etkinleştirildi.");
      await refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Abonelik güncellenemedi.");
    } finally { setBusy(false); }
  }

  if (loading) return <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/5" />)}</div>;
  if (!data) return <Card className="p-8 text-center"><h2 className="text-xl font-black">Billing yüklenemedi</h2><p className="mt-2 text-sm text-zinc-400">{error}</p><Button className="mt-5" onClick={() => { setLoading(true); void refresh(); }}>Tekrar dene</Button></Card>;

  return (
    <div className="space-y-5">
      <Modal title="Plan değişikliğini onayla" open={Boolean(pendingChange)} onClose={() => { if (!busy) setPendingChange(null); }}>
        {pendingChange && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Mevcut plan</p><p className="mt-2 text-lg font-black">{billingPlans[pendingChange.currentPlan].name} · {pendingChange.currentInterval === "monthly" ? "Aylık" : "Yıllık"}</p></div>
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-xs uppercase tracking-[0.14em] text-emerald-300">Yeni plan</p><p className="mt-2 text-lg font-black">{billingPlans[pendingChange.newPlan].name} · {pendingChange.newInterval === "monthly" ? "Aylık" : "Yıllık"}</p></div>
            </div>
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Onayladığında mevcut aboneliğin hemen güncellenir. Stripe kalan dönem için prorasyon faturası oluşturur ve kayıtlı ödeme yöntemini ücretlendirebilir.</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={busy} onClick={() => setPendingChange(null)}>Vazgeç</Button><Button disabled={busy} onClick={() => void confirmPlanChange()}>{busy ? "İşleniyor..." : "Plan değişikliğini onayla"}</Button></div>
          </div>
        )}
      </Modal>
      {(error || notice) && <div className={`rounded-lg border p-4 text-sm ${error ? "border-red-400/20 bg-red-400/10 text-red-100" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"}`}>{error || notice}</div>}
      {!data.stripeConfigured && <Card className="border-amber-400/20 bg-amber-400/5 p-4"><p className="font-black text-amber-100">Stripe henüz yapılandırılmadı</p><p className="mt-1 text-sm text-amber-100/70">Gerçek ödeme başlatmak için sunucu Stripe anahtarları ve Price ID’leri eklenmeli. Mevcut Free plan kullanılmaya devam eder.</p></Card>}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Mevcut plan</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-black">{data.plan.name}</h2><p className="mt-2 text-sm text-zinc-400">Durum: <span className="font-bold text-zinc-200">{data.subscription.status}</span></p><p className="mt-1 text-sm text-zinc-400">Sonraki yenileme: <span className="font-bold text-zinc-200">{dateLabel(data.subscription.currentPeriodEnd)}</span></p>{data.subscription.trialEnd && <p className="mt-1 text-sm text-emerald-300">Deneme bitişi: {dateLabel(data.subscription.trialEnd)}</p>}</div><div className="flex flex-wrap gap-2">{data.portalAvailable && <Button variant="secondary" disabled={busy} onClick={() => void redirect("/api/billing/portal")}>Planı ve ödemeyi yönet</Button>}{data.plan.id === "free" ? <Button disabled={busy || !data.stripeConfigured} onClick={() => selectPlan("pro")}>Pro’ya yükselt</Button> : data.subscription.cancelAtPeriodEnd ? <Button disabled={busy} onClick={() => void updateCancellation("reactivate")}>Yeniden etkinleştir</Button> : <Button variant="secondary" disabled={busy} onClick={() => void updateCancellation("cancel")}>Dönem sonunda iptal et</Button>}</div></div>{data.subscription.cancelAtPeriodEnd && <p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-100">Abonelik {dateLabel(data.subscription.currentPeriodEnd)} tarihinde sona erecek.</p>}</Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Aylık kullanım</p><div className="mt-4 space-y-5">{data.usage.map((item) => <UsageProgress key={item.metric} item={item} />)}</div></Card>
      </div>

      <section><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Planlar</p><h2 className="mt-1 text-xl font-black">İhtiyacına uygun planı seç</h2></div><div className="inline-flex rounded-lg border border-white/10 bg-zinc-950 p-1"><button className={`rounded-md px-4 py-2 text-sm font-bold ${interval === "monthly" ? "bg-white text-zinc-950" : "text-zinc-400"}`} onClick={() => setInterval("monthly")}>Aylık</button><button className={`rounded-md px-4 py-2 text-sm font-bold ${interval === "yearly" ? "bg-white text-zinc-950" : "text-zinc-400"}`} onClick={() => setInterval("yearly")}>Yıllık</button></div></div><div className="grid gap-4 lg:grid-cols-3">{Object.values(billingPlans).map((plan) => <PlanCard key={plan.id} plan={plan} interval={interval} price={data.prices[plan.id][interval]} currentPlan={data.plan.id} busy={busy || !data.stripeConfigured} onSelect={selectPlan} />)}</div></section>

      <Card className="overflow-hidden"><div className="border-b border-white/10 p-5"><h2 className="text-lg font-black">Fatura geçmişi</h2><p className="mt-1 text-sm text-zinc-500">Yalnızca Stripe tarafından oluşturulan gerçek faturalar gösterilir.</p></div>{data.invoices.length === 0 ? <p className="p-6 text-sm text-zinc-500">Henüz fatura bulunmuyor.</p> : <div className="divide-y divide-white/10">{data.invoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-bold">{invoice.number || "Stripe faturası"}</p><p className="mt-1 text-xs text-zinc-500">{dateLabel(invoice.createdAt)} · {invoice.status || "-"}</p></div><div className="flex items-center gap-3"><span className="font-black">{money(invoice.amount, invoice.currency)}</span>{invoice.hostedUrl && <a href={invoice.hostedUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold hover:bg-white/5">Faturayı aç</a>}</div></div>)}</div>}</Card>
    </div>
  );
}
