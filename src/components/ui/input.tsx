import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-200/80 bg-white/90 px-3 text-sm text-zinc-900 shadow-sm outline-none ring-indigo-500/80 backdrop-blur transition focus:border-indigo-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-300",
        className,
      )}
      {...props}
    />
  );
}
