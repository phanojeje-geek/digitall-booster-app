import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 active:scale-[0.98] active:brightness-110 motion-reduce:active:scale-100 touch-manipulation disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 hover:-translate-y-0.5 hover:bg-indigo-500 active:shadow-indigo-400/50",
        variant === "secondary" &&
          "bg-zinc-900 text-white hover:-translate-y-0.5 hover:bg-zinc-800 active:shadow-md active:shadow-zinc-500/30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
        variant === "ghost" &&
          "border border-zinc-200/80 bg-white/90 text-zinc-800 shadow-sm backdrop-blur hover:bg-white active:shadow-md active:shadow-zinc-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        variant === "danger" && "bg-red-600 text-white shadow-sm shadow-red-500/30 hover:bg-red-500 active:shadow-red-400/50",
        className,
      )}
      {...props}
    />
  );
}
