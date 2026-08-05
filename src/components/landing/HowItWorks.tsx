"use client";

import { motion } from "framer-motion";
import { ArrowRight, Camera, FileText, HeartPulse, Target, Upload } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Video",
    description: "Drop in a practice session or match clip from your phone or laptop.",
  },
  {
    icon: Camera,
    title: "Frame Extraction",
    description: "Capture every frame so no movement detail is missed.",
  },
  {
    icon: Target,
    title: "Pose Detection",
    description: "Map joint position, balance, rotation, timing, and recovery through each movement.",
  },
  {
    icon: ArrowRight,
    title: "Sport & Action Recognition",
    description: "Identify the selected sport, technique, delivery, shot, or movement pattern.",
  },
  {
    icon: HeartPulse,
    title: "Biomechanics Analysis",
    description: "Measure timing, angles, and efficiency from a pro coaching perspective.",
  },
  {
    icon: FileText,
    title: "AI Coaching Report",
    description: "Receive polished recommendations that accelerate your next session.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-slate-900/70 px-6 py-16 sm:px-8 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">How it works</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Upload → Analyze → Improve
        </h2>
        <p className="mt-4 text-lg leading-8 text-slate-400">
          A simple workflow that brings clarity to your training and turns insights into action.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-slate-500">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{step.description}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span>Ready to see it live?</span>
        <a href="#pricing" className="inline-flex items-center gap-2 font-medium text-emerald-300">
          Explore plans
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
