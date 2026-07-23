type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Yükleniyor" }: LoadingProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3 text-sm text-zinc-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-300" />
        {label}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-400" />
      </div>
    </div>
  );
}
