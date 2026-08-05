"use client";

import { motion } from "framer-motion";
import { Activity, CircleDot, Crosshair, Goal, Trophy } from "lucide-react";

import { supportedSports } from "@/lib/sports";

const icons = [CircleDot, Crosshair, Activity, Trophy, Goal];

export default function Sports() {
  return (
    <section id="sports" className="scroll-mt-24 py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">One platform, multiple sports</p>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Sport-specific intelligence, built on a shared motion platform.</h2>
        <p className="mt-4 text-lg leading-8 text-slate-400">The core video, pose, biomechanics, AI routing, reporting, and progress systems are shared. Each sport adds its own actions, coaching vocabulary, scoring rules, and knowledge pack.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {supportedSports.map((sport, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <motion.article key={sport.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 text-lg font-semibold text-white">{sport.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{sport.description}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-emerald-300">{sport.actions.length} technique modules</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
