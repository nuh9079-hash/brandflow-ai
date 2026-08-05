import { Card } from "@/components/ui";
import type { DistributionPoint, TrendPoint } from "@/lib/analytics/server";

const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#c084fc"];

function empty(message: string) {
  return <div className="grid h-52 place-items-center text-sm text-zinc-500">{message}</div>;
}

export function LineChart({ title, helper, data, suffix = "" }: { title: string; helper: string; data: TrendPoint[]; suffix?: string }) {
  const width = 640;
  const height = 190;
  const max = Math.max(...data.map((point) => point.value), 1);
  const hasData = data.some((point) => point.value > 0);
  const points = data.map((point, index) => `${(index / Math.max(data.length - 1, 1)) * width},${height - (point.value / max) * (height - 20)}`).join(" ");
  return (
    <Card className="p-5">
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      {!hasData ? empty("Bu dönem için veri yok.") : (
        <div className="mt-5">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label={title}>
            {[0.25, 0.5, 0.75, 1].map((step) => <line key={step} x1="0" y1={height * step} x2={width} y2={height * step} stroke="rgba(255,255,255,.07)" />)}
            <polyline fill="none" stroke="#34d399" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={points} />
          </svg>
          <div className="flex justify-between text-xs text-zinc-500"><span>{data[0]?.date.slice(5)}</span><span>En yüksek: {max}{suffix}</span><span>{data.at(-1)?.date.slice(5)}</span></div>
        </div>
      )}
    </Card>
  );
}

export function BarChart({ title, helper, data }: { title: string; helper: string; data: DistributionPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const labels: Record<string, string> = { draft: "Taslak", scheduled: "Planlandı", publishing: "Yayınlanıyor", published: "Yayınlandı", failed: "Başarısız", twitter: "X", x: "X" };
  return (
    <Card className="p-5">
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      {data.every((point) => point.value === 0) ? empty("Bu dönem için veri yok.") : (
        <div className="mt-6 space-y-4">
          {data.map((point, index) => (
            <div key={point.label}>
              <div className="mb-2 flex justify-between text-xs"><span className="capitalize text-zinc-300">{labels[point.label] ?? point.label}</span><span className="font-black text-white">{point.value}</span></div>
              <div className="h-2 rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${(point.value / max) * 100}%`, backgroundColor: colors[index % colors.length] }} /></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
