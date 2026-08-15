"use client";

import { BadgeCheck, PlayCircle } from "lucide-react";

import { APP_RELEASE_NAME, APP_VERSION, VISUAL_BENCHMARK_FEATURES } from "@/lib/config/version";

export default function VisualBenchmarkReleaseBanner() {
  function openComparison() {
    document.getElementById("reference-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-violet-400/35 bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(14,165,233,0.12),rgba(15,23,42,0.92))] shadow-2xl shadow-black/20 print:hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
            <BadgeCheck className="h-4 w-4" />
            Athlentra v{APP_VERSION} · Visual benchmark active
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{APP_RELEASE_NAME}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            Your measured video now drives two synchronized silhouette simulations: one for your category and one for an elite organizing principle. Phase controls, swing paths, and directional gap markers update from the same athlete-video clock.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {VISUAL_BENCHMARK_FEATURES.slice(0, 3).map((feature) => (
              <span key={feature} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-200">
                {feature}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={openComparison}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
        >
          <PlayCircle className="h-5 w-5" />
          Open Motion Twin Lab
        </button>
      </div>
    </section>
  );
}
