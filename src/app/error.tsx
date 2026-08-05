"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white"><section className="max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 text-center"><h1 className="text-3xl font-semibold">Something went wrong</h1><p className="mt-3 text-slate-400">Please try again. Reference: {error.digest ?? "local"}</p><Button onClick={reset} className="mt-6 bg-emerald-500 text-slate-950 hover:bg-emerald-400">Try again</Button></section></main>;
}
