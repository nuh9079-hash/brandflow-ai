import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Button, Card } from "@/components/ui";

const plans = [
  { name: "Free", price: "$0", features: ["20 AI credits", "Basic history", "Single workspace"] },
  { name: "Pro", price: "$19", features: ["500 AI credits", "Favorites", "Brand settings", "Priority models"] },
  { name: "Business", price: "$49", features: ["2,000 AI credits", "Team workspace", "Advanced history", "Priority support"] },
];

export default async function BillingPage() {
  await auth.protect();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="Billing" />
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Billing">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Plan seçimi hazır. Payment integration Sprint 3 için ayrıldı.</p>
          </Navbar>
          <div className="grid gap-4 pt-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className="p-5">
                <p className="text-sm font-semibold text-emerald-300">{plan.name}</p>
                <p className="mt-4 text-4xl font-black text-white">{plan.price}<span className="text-sm font-medium text-zinc-500">/mo</span></p>
                <ul className="mt-5 space-y-3 text-sm text-zinc-300">
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <Button type="button" className="mt-6 w-full" variant={plan.name === "Pro" ? "primary" : "secondary"}>
                  {plan.name === "Free" ? "Current" : "Coming soon"}
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
