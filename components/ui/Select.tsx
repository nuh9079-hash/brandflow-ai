import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[];
};

export function Select({ label, id, options, className = "", ...props }: SelectProps) {
  return (
    <label className="block text-sm font-semibold text-zinc-200" htmlFor={id}>
      {label}
      <select
        id={id}
        className={`mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-300 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
