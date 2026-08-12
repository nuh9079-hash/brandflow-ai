import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { listScheduledPublishes } from "@/lib/scheduling/server";
import { listMedia } from "@/lib/media/server";
import { QueueClient } from "./QueueClient";

export default async function QueuePage() {
  const { userId } = await auth.protect();
  const [plans, media] = await Promise.all([listScheduledPublishes(userId), listMedia(userId, { sort: "newest" })]);
  return <main className="min-h-screen bg-[#09090b] text-zinc-100"><section className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Planlananlar"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Yayın kuyruğunu düzenle, zamanı gelmeden yayınla veya iptal et.</p></Navbar><div className="pt-6"><QueueClient initialItems={plans.ok ? plans.data : []} mediaAssets={media.ok ? media.data : []} initialError={plans.ok ? "" : plans.error} /></div></section></main>;
}
