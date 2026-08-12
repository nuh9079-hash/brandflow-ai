import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { BillingClient } from "./BillingClient";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  await auth.protect();
  const { checkout } = await searchParams;

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Billing">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Planını, aylık kullanımını, yenileme tarihini ve Stripe faturalarını tek yerden yönet.</p>
          </Navbar>
          <div className="pt-6"><BillingClient checkoutState={checkout} /></div>
        </section>
      </div>
    </main>
  );
}
