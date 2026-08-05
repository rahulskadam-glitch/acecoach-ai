"use client";

import { motion } from "framer-motion";
import { BookOpenCheck, BrainCircuit, Film, Repeat2, Scale, Sparkles, Target, Users } from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Movement intelligence",
    description: "Detect the movement, segment repetitions, and link every coaching observation to the relevant moment in the clip.",
  },
  {
    icon: Film,
    title: "Visual swing story",
    description: "See preparation, loading, contact, finish, and recovery as clickable key frames before opening technical detail.",
  },
  {
    icon: Scale,
    title: "Reference studio",
    description: "Compare your movement with curated governing-body coaching references without pretending one athlete is a universal template.",
  },
  {
    icon: Target,
    title: "One priority first",
    description: "Preserve your strongest quality and work on the single correction most likely to unlock the rest of the movement chain.",
  },
  {
    icon: BookOpenCheck,
    title: "Guided practice",
    description: "Receive a cue, drill dosage, pass condition, and seven-day reassessment plan instead of a long list of faults.",
  },
  {
    icon: Repeat2,
    title: "Improvement loop",
    description: "Record comparable sessions, track practice evidence, and compare only when capture and engine conditions are sufficiently consistent.",
  },
  {
    icon: Users,
    title: "Coach-ready reports",
    description: "Share an expiring report summary so a human coach can validate findings and strengthen the next practice plan.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-20">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Trust and progress analytics v3.2
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Understand the correction. Practise it. Prove it improved.
        </h2>
        <p className="mt-4 text-lg leading-8 text-slate-400">
          AceCoach turns video into an explainable improvement loop rather than a score-only report.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
