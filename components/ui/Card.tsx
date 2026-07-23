import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-[#141416] shadow-xl shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
