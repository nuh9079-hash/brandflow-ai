import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: InputProps) {
  return (
    <label className="block text-sm font-semibold text-zinc-200" htmlFor={id}>
      {label}
      <input
        id={id}
        className={`mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-emerald-300 ${className}`}
        {...props}
      />
    </label>
  );
}
