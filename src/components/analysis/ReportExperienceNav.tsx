"use client";

import { Activity, BarChart3, BookOpenCheck, Film, FlaskConical, PlayCircle, Scale, Sparkles, Workflow } from "lucide-react";

const items = [
  { id: "coach-summary", label: "Coach summary", icon: Sparkles },
  { id: "reference-studio", label: "SYNC MOTION TWINS", icon: Scale, featured: true },
  { id: "movement-map", label: "Swing map", icon: Workflow },
  { id: "body-map", label: "Body map", icon: Activity },
  { id: "visual-story", label: "Key frames", icon: Film },
  { id: "synchronized-video", label: "Annotated video", icon: PlayCircle },
  { id: "practice-plan", label: "Practice", icon: BookOpenCheck },
  { id: "repetition-lab", label: "Repetitions", icon: BarChart3 },
  { id: "science-detail", label: "Science", icon: FlaskConical },
];

export default function ReportExperienceNav() {
  return (
    <nav className="sticky top-3 z-30 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-xl shadow-black/20 backdrop-blur print:hidden" aria-label="Report sections">
      <div className="flex min-w-max gap-1">
        {items.map(({ id, label, icon: Icon, featured }) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={featured
              ? "flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-400/15 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/25"
              : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>
    </nav>
  );
}
