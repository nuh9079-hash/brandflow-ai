import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:opacity-50",
  secondary: "border border-white/10 text-zinc-200 hover:bg-white/5 disabled:opacity-45",
  ghost: "text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-45",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-3 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
