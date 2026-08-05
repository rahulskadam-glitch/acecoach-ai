import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <div className="flex flex-col gap-5 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400"><Sparkles className="h-4 w-4" />Athlete intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Your training command centre</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review evidence-linked coaching, compare repeatable sessions, and take one clear technical priority into practice.</p>
      </div>
      <Link href="/upload" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15">New analysis<ArrowUpRight className="h-4 w-4" /></Link>
    </div>
  );
}
