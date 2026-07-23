import { Card } from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {helper && <p className="mt-2 text-sm text-zinc-400">{helper}</p>}
    </Card>
  );
}
