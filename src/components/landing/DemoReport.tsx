"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Film, PlayCircle, Scale, Target } from "lucide-react";

const moments = [
  { label: "Preparation", status: "Keep", note: "Early shoulder organization creates time." },
  { label: "Spacing", status: "Fix first", note: "Create more room before the forward swing." },
  { label: "Contact", status: "Build", note: "Send the racket through a clearer target window." },
  { label: "Recovery", status: "Build", note: "Reset sooner after the finish." },
];

export default function DemoReport() {
  return (
    <section id="demo" className="scroll-mt-24 py-20">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Player-first reporting</p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">The answer should be obvious before the athlete reaches the technical appendix.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-400">The report starts with visual proof, one correction, a reference model, and a practice test. Technical measurements remain available for coaches and advanced players.</p>
          <div className="mt-7 space-y-3 text-sm text-slate-300">
            <p className="flex gap-3"><Film className="mt-0.5 h-5 w-5 text-emerald-400" /> Clickable frames show exactly where the feedback comes from.</p>
            <p className="flex gap-3"><Scale className="mt-0.5 h-5 w-5 text-emerald-400" /> Curated reference videos illustrate principles without claiming a peer percentile.</p>
            <p className="flex gap-3"><Target className="mt-0.5 h-5 w-5 text-emerald-400" /> One primary correction leads to a drill, cue, and measurable pass condition.</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70">
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
              <div className="aspect-video rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2),transparent_38%),#020617] p-5">
                <div className="flex h-full flex-col items-center justify-center text-center"><PlayCircle className="h-14 w-14 text-emerald-300" /><p className="mt-4 font-semibold text-white">Annotated backhand playback</p><p className="mt-2 text-sm text-slate-400">Pose overlay · hand path · key phases</p></div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Fix first</p><p className="mt-2 font-semibold text-white">Create more space before contact</p><p className="mt-2 text-sm text-slate-400">Cue: “Arrive beside the ball, not underneath it.”</p></div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-violet-300" /><p className="font-semibold text-white">Reference checkpoints</p></div>
              <div className="mt-4 space-y-3">
                {moments.map((moment) => <div key={moment.label} className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white">{moment.label}</p><span className={`text-xs font-semibold ${moment.status === "Keep" ? "text-emerald-300" : moment.status === "Fix first" ? "text-amber-300" : "text-sky-300"}`}>{moment.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{moment.note}</p></div>)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
