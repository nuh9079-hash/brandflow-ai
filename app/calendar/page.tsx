import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage() {
  await auth.protect();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="Calendar" />
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Calendar">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Medya Merkezindeki görsel ve videoları sosyal medya takvimine yerleştir, saatini düzenle ve gerçek yayın sağlayıcıları bağlandığında otomatik paylaş.
            </p>
          </Navbar>
          <div className="pt-6">
            <CalendarClient />
          </div>
        </section>
      </div>
    </main>
  );
}
