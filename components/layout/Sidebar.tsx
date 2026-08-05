import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/create", label: "Create" },
  { href: "/history", label: "History" },
  { href: "/favorites", label: "Favorites" },
  { href: "/publish", label: "Paylaşım Merkezi" },
  { href: "/connections", label: "Bağlantılar" },
  { href: "/calendar", label: "Calendar" },
  { href: "/profiles", label: "Profiller" },
  { href: "/media", label: "Medya Merkezi" },
  { href: "/image-studio", label: "AI Image Studio" },
  { href: "/video-studio", label: "AI Video Studio" },
  { href: "/marketing-advisor", label: "AI Marketing Advisor" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

type SidebarProps = {
  active?: string;
};

export function Sidebar({ active = "Dashboard" }: SidebarProps) {
  return (
    <aside className="border-b border-white/10 bg-[#111113] px-5 py-4 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
      <div className="flex items-center justify-between lg:block">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400 text-sm font-black text-zinc-950">BF</div>
          <div>
            <p className="text-sm text-zinc-400">Studio</p>
            <h1 className="text-xl font-bold text-white">BrandFlow AI</h1>
          </div>
        </Link>
        <div className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-300 lg:mt-8 lg:inline-block">
          Groq aktif
        </div>
      </div>

      <nav className="mt-8 hidden space-y-2 lg:block">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active === item.label ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Card className="mt-8 hidden p-4 lg:block">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Workspace</p>
        <p className="mt-3 text-2xl font-semibold text-white">SaaS</p>
        <p className="mt-1 text-sm text-zinc-400">Auth, history, favorites, settings ve billing temeli hazır.</p>
      </Card>

      <div className="mt-4 hidden lg:block">
        <ProfileSwitcher compact />
      </div>
    </aside>
  );
}
