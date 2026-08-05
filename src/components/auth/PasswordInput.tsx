"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
};

export default function PasswordInput({ wrapperClassName, className, id, ...props }: Props) {
  const [show, setShow] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 transition-all duration-200",
        "focus-within:border-emerald-500/50 focus-within:bg-slate-950/80 focus-within:ring-1 focus-within:ring-emerald-500/20",
        wrapperClassName,
      )}
    >
      <Lock className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-focus-within:text-emerald-400" />
      <input
        {...props}
        id={inputId}
        type={show ? "text" : "password"}
        className={cn("w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600", className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={inputId}
        className="shrink-0 text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
