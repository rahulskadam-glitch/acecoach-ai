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
        "group flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 transition-all duration-200",
        "focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100",
        wrapperClassName,
      )}
    >
      <Lock className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-700" />
      <input
        {...props}
        id={inputId}
        type={show ? "text" : "password"}
        className={cn("w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-500", className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={inputId}
        className="shrink-0 rounded text-slate-500 transition-colors hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
