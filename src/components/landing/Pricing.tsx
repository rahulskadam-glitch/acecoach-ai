"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Research Beta",
    price: "$0",
    description: "Test the complete improvement loop while the movement models are being validated.",
    features: ["Capture-quality checks", "Annotated movement report", "One-priority practice plan", "Private coach-summary link"],
    cta: "Use the beta",
    href: "/upload",
    featured: true,
  },
  {
    name: "Player Plus",
    price: "$9.99",
    suffix: "planned / month",
    description: "A proposed player plan informed by public reviews and current category pricing.",
    features: ["Higher monthly analysis allowance", "Guided practice and check-ins", "Longitudinal comparisons", "Priority support"],
    cta: "Preview in beta",
    href: "/signup",
    featured: false,
  },
  {
    name: "Coach Pilot",
    price: "$39",
    suffix: "planned / month",
    description: "A proposed coach workspace for athlete review, voice feedback, and practice-plan approval.",
    features: ["Multi-athlete library", "Coach annotations and audio", "Plan approval workflow", "Academy-ready reporting"],
    cta: "Explore the player beta",
    href: "/signup",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          Transparent beta pricing
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Know what is available now—and what is still planned.</h2>
        <p className="mt-4 text-lg leading-8 text-slate-400">No payment is collected in this research build. Planned prices are shown early so the eventual product does not surprise athletes with a hidden paywall.</p>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-sm leading-6 text-sky-100/80"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" /><p>Before paid launch, Athlentra will add clear usage limits, in-app plan management, cancellation controls, and regional pricing.</p></div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, index) => (
          <motion.div key={tier.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.08 }} className={`rounded-[1.75rem] border p-6 shadow-lg ${tier.featured ? "border-emerald-500/40 bg-emerald-500/10 shadow-emerald-900/20" : "border-white/10 bg-slate-900/70 shadow-black/20"}`}>
            <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-white">{tier.name}</h3>{tier.featured ? <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">Available now</span> : <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Planned</span>}</div>
            <p className="mt-4 min-h-20 text-sm leading-7 text-slate-400">{tier.description}</p>
            <p className="mt-6 text-4xl font-black text-white">{tier.price}</p>
            <p className="mt-1 text-sm text-slate-500">{tier.suffix ?? "during research beta"}</p>
            <ul className="mt-6 space-y-3">{tier.features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><span>{feature}</span></li>)}</ul>
            <a href={tier.href} className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-3 font-semibold transition ${tier.featured ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>{tier.cta}</a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
