import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg border border-white/10 bg-[#141416] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>Kapat</Button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
