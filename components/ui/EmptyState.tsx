import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">{description}</p>
    </Card>
  );
}
