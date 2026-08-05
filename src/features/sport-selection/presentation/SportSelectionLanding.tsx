"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AceCoachMark from "@/components/design-system/AceCoachMark";
import { selectJourneySport } from "@/app/actions/journey-actions";
import type { SportDefinition } from "@/lib/sports";

export default function SportSelectionLanding({ sports, authenticated }: { sports: SportDefinition[]; authenticated: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseSport(sportId: string) {
    setSelected(sportId);
    setError(null);
    try {
      await selectJourneySport(sportId);
      window.localStorage.setItem("acecoach-selected-sport", sportId);
      router.push(authenticated ? `/start?sport=${encodeURIComponent(sportId)}` : `/auth?sport=${encodeURIComponent(sportId)}&next=/start`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your sport selection.");
      setSelected(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <AceCoachMark />
        <div className="flex items-center gap-4 text-sm">
          <a href="/methodology" className="hidden font-medium text-slate-600 hover:text-slate-950 sm:inline">Methodology</a>
          <a href="/support" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium text-slate-700 shadow-sm hover:border-slate-300">Help</a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl">Choose your sport. <span className="text-blue-800">Start improving.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-8 text-slate-600 sm:text-lg">Upload one movement and receive a clear, personalized coaching plan.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {sports.map((sport) => (
            <button
              key={sport.id}
              type="button"
              onClick={() => chooseSport(sport.id)}
              disabled={selected !== null}
              className={`group flex min-h-56 flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-4 disabled:cursor-wait ${selected === sport.id ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg"}`}
            >
              <span className="text-3xl" aria-hidden="true">{sport.icon}</span>
              <span className="mt-6 text-lg font-semibold text-slate-950">{sport.name}</span>
              <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">{sport.description}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">{selected === sport.id ? "Opening…" : `Choose ${sport.name}`}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
            </button>
          ))}
        </div>
        {error ? <p role="alert" className="mt-5 text-center text-sm text-rose-700">{error}</p> : null}

        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />Your original video remains private, downloadable, and under your control.</div>

      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-slate-500 sm:px-8">
          <span>© 2026 AceCoach AI</span>
          <div className="flex gap-5"><a href="/privacy" className="hover:text-slate-950">Privacy</a><a href="/terms" className="hover:text-slate-950">Terms</a><a href="/methodology" className="hover:text-slate-950">Methodology</a></div>
        </div>
      </footer>
    </main>
  );
}
