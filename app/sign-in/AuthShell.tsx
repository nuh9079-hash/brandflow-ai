const appearance = {
  elements: {
    cardBox: "shadow-2xl",
    card: "bg-zinc-950 border border-white/10",
    headerTitle: "text-zinc-50",
    headerSubtitle: "text-zinc-400",
    socialButtonsBlockButton: "border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10",
    formButtonPrimary: "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
    formFieldInput: "bg-zinc-900 border-white/10 text-zinc-100",
    footerActionText: "text-zinc-400",
    footerActionLink: "text-emerald-300 hover:text-emerald-200",
  },
};

export function AuthShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#09090b] px-5 py-10 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-emerald-400 text-sm font-black text-zinc-950">
            BF
          </div>
          <h1 className="mt-4 text-2xl font-bold">BrandFlow AI</h1>
          <p className="mt-2 text-sm text-zinc-400">AI destekli sosyal medya içerik paneline devam et.</p>
        </div>
        <div className="flex justify-center">{children}</div>
      </div>
    </main>
  );
}

export { appearance };
