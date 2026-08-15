"use client";

import { motion } from "framer-motion";
import { ArrowRight, Camera, Check, Play, Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { getSport, supportedSports } from "@/lib/sports";
import type { SportId } from "@/lib/sports/types";

export default function Hero() {
  const [sportId, setSportId] = useState<SportId>("tennis");
  const sport = useMemo(() => getSport(sportId), [sportId]);
  const uploadHref = `/upload?sport=${sport.id}&action=${sport.actions[0].id}`;

  return (
    <section id="hero" className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/70 px-6 py-12 shadow-2xl shadow-emerald-950/30 sm:px-8 lg:px-10 lg:py-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_28%)]" />

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Your tennis coach</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="Supported sports">
          {supportedSports.map((item) => {
            const selected = item.id === sport.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSportId(item.id)}
                className={`group relative rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-emerald-400/70 bg-emerald-500/15 shadow-lg shadow-emerald-950/30" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span className="mt-1 block text-sm font-semibold text-white">{item.shortName}</span>
                {selected ? <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-300" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div key={sport.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
            <Sparkles className="h-4 w-4" />
            {sport.name}-specific AI coaching
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">{sport.heroHeadline}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300 sm:text-xl">{sport.heroDescription}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={uploadHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400">
              Analyze {sport.name} Video <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
              <Play className="h-4 w-4" /> See how it works
            </a>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-slate-300 sm:text-base">
            {["Frame-by-frame motion breakdown", ...sport.coachingFocus].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Zap className="h-4 w-4" /></span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div key={`${sport.id}-preview`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/30">
          <div className="rounded-[1.65rem] border border-white/10 bg-slate-800/80 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Live analysis preview</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{sport.actions[0].label} sequence</h2>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Camera className="h-5 w-5" /></span>
            </div>

            <div className="mt-7 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Movement quality</span><span className="font-semibold text-emerald-300">Sport-aware</span></div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-3/4 rounded-full bg-emerald-500" /></div>
              <div className="mt-6 space-y-3">
                {sport.coachingFocus.map((focus) => (
                  <div key={focus} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="font-semibold text-white">{focus}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Scored against the movement standards and coaching language defined for {sport.name.toLowerCase()}.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
