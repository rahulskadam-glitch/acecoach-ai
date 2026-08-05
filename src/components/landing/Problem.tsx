"use client";

import { motion } from "framer-motion";

const points = [
  {
    title: "Player",
    description: "Training without objective video feedback leaves progress misaligned and uncertain.",
  },
  {
    title: "Guessing",
    description: "Practices feel reactive instead of data-driven, so improvement is slow and fragmented.",
  },
  {
    title: "Slow improvement",
    description: "Without clear mechanics, time on court does not always translate to meaningful gains.",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-[#0E1728]/95 p-8 sm:p-10 lg:p-12">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Problem</p>
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Every athlete reaches a technical plateau.
          </h2>
          <p className="max-w-xl text-lg leading-8 text-slate-300">
            Without objective video analysis, players rely on guesses. Technical mistakes stay hidden, training loses focus, and progress stalls.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="grid gap-5 sm:grid-cols-3"
        >
          {points.map((point) => (
            <div key={point.title} className="rounded-[1.75rem] border border-white/10 bg-[#111827]/90 p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.28em] text-white/50">{point.title}</p>
              <p className="mt-4 text-base leading-7 text-slate-300">{point.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
