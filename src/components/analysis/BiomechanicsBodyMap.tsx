"use client";

import { Activity, ArrowRight, Footprints, Hand, PersonStanding, Rotate3D, Target } from "lucide-react";

import type { AnalysisReport } from "@/modules/analysis/types";

type CoachingArea = NonNullable<AnalysisReport["coachingAreas"]>[number];

function tone(area?: CoachingArea) {
  if (!area) return { fill: "#334155", stroke: "#64748b", text: "text-slate-400", bg: "border-white/10 bg-slate-950/60" };
  if (area.status === "strength") return { fill: "#10b981", stroke: "#6ee7b7", text: "text-emerald-300", bg: "border-emerald-500/25 bg-emerald-500/[0.06]" };
  if (area.status === "priority") return { fill: "#f59e0b", stroke: "#fcd34d", text: "text-amber-300", bg: "border-amber-500/25 bg-amber-500/[0.06]" };
  return { fill: "#38bdf8", stroke: "#7dd3fc", text: "text-sky-300", bg: "border-sky-500/20 bg-sky-500/[0.05]" };
}

function findArea(areas: CoachingArea[], ids: string[]) {
  return areas.find((area) => ids.includes(area.id));
}

function seek(area?: CoachingArea) {
  if (typeof area?.timestampSeconds !== "number") return;
  window.dispatchEvent(new CustomEvent("acecoach:seek-video", { detail: { time: area.timestampSeconds } }));
  document.getElementById("synchronized-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function BiomechanicsBodyMap({ report }: { report: AnalysisReport }) {
  const areas = report.coachingAreas ?? [];
  if (areas.length === 0) return null;

  const footwork = findArea(areas, ["footwork_base"]);
  const loading = findArea(areas, ["lower_body_loading"]);
  const trunk = findArea(areas, ["body_position"]);
  const preparation = findArea(areas, ["backlift_preparation"]);
  const swing = findArea(areas, ["hand_swing_path"]);
  const contact = findArea(areas, ["contact_spacing"]);
  const finish = findArea(areas, ["ending_position"]);
  const repeatability = findArea(areas, ["repeatability"]);

  const legTone = tone(footwork?.score && loading?.score ? (footwork.score <= loading.score ? footwork : loading) : footwork ?? loading);
  const torsoTone = tone(trunk);
  const armTone = tone(preparation?.score && swing?.score ? (preparation.score <= swing.score ? preparation : swing) : preparation ?? swing);
  const handTone = tone(contact);
  const headTone = tone(finish);
  const weakest = [...areas].sort((a, b) => a.score - b.score)[0];
  const strongest = [...areas].sort((a, b) => b.score - a.score)[0];

  const cards: Array<{ label: string; area?: CoachingArea; icon: typeof Footprints }> = [
    { label: "Feet and spacing", area: footwork, icon: Footprints },
    { label: "Lower-body loading", area: loading, icon: PersonStanding },
    { label: "Body position", area: trunk, icon: Rotate3D },
    { label: "Preparation and backlift", area: preparation, icon: Activity },
    { label: "Hand and swing path", area: swing, icon: Hand },
    { label: "Contact window", area: contact, icon: Target },
    { label: "Finish and recovery", area: finish, icon: ArrowRight },
  ];

  return (
    <section id="body-map" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_30%),rgba(15,23,42,0.78)] shadow-xl shadow-black/20">
      <div className="grid gap-0 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-white/10 p-6 xl:border-b-0 xl:border-r lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Visual biomechanics body map</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Where the movement chain is helping—or leaking</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The body map groups measured 2D pose proxies into coaching zones. Select a zone to jump to the most relevant frame.
          </p>

          <div className="mt-6 flex justify-center">
            <svg viewBox="0 0 260 440" className="h-[390px] w-full max-w-[280px]" role="img" aria-label="Color-coded movement-chain body map">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <circle cx="130" cy="48" r="28" fill={headTone.fill} stroke={headTone.stroke} strokeWidth="4" filter="url(#glow)" />
              <line x1="130" y1="78" x2="130" y2="210" stroke={torsoTone.stroke} strokeWidth="18" strokeLinecap="round" filter="url(#glow)" />
              <line x1="130" y1="105" x2="70" y2="180" stroke={armTone.stroke} strokeWidth="15" strokeLinecap="round" />
              <line x1="130" y1="105" x2="196" y2="178" stroke={armTone.stroke} strokeWidth="15" strokeLinecap="round" />
              <circle cx="64" cy="188" r="12" fill={handTone.fill} stroke={handTone.stroke} strokeWidth="4" filter="url(#glow)" />
              <circle cx="202" cy="186" r="12" fill={handTone.fill} stroke={handTone.stroke} strokeWidth="4" filter="url(#glow)" />
              <line x1="130" y1="210" x2="86" y2="326" stroke={legTone.stroke} strokeWidth="18" strokeLinecap="round" />
              <line x1="130" y1="210" x2="176" y2="326" stroke={legTone.stroke} strokeWidth="18" strokeLinecap="round" />
              <line x1="86" y1="326" x2="66" y2="410" stroke={legTone.stroke} strokeWidth="16" strokeLinecap="round" />
              <line x1="176" y1="326" x2="198" y2="410" stroke={legTone.stroke} strokeWidth="16" strokeLinecap="round" />
              <ellipse cx="54" cy="416" rx="26" ry="10" fill={legTone.fill} stroke={legTone.stroke} strokeWidth="3" />
              <ellipse cx="210" cy="416" rx="26" ry="10" fill={legTone.fill} stroke={legTone.stroke} strokeWidth="3" />
              <circle cx="130" cy="210" r="18" fill={torsoTone.fill} stroke={torsoTone.stroke} strokeWidth="4" />
              <circle cx="130" cy="105" r="16" fill={armTone.fill} stroke={armTone.stroke} strokeWidth="4" />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-3 text-emerald-200">Strength</div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-2 py-3 text-sky-200">Developing</div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-2 py-3 text-amber-200">Priority</div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-2xl border p-5 ${tone(strongest).bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone(strongest).text}`}>Strongest link</p>
              <p className="mt-2 text-xl font-semibold text-white">{strongest?.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{strongest?.observation}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${tone(weakest).bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone(weakest).text}`}>First leak to address</p>
              <p className="mt-2 text-xl font-semibold text-white">{weakest?.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{weakest?.coachingGoal}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {cards.map(({ label, area, icon: Icon }) => {
              const meta = tone(area);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => seek(area)}
                  disabled={!area || typeof area.timestampSeconds !== "number"}
                  className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-60 ${meta.bg}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] ${meta.text}`}>
                      <Icon className="h-4 w-4" />
                      {area?.status ?? "Not measured"}
                    </div>
                    <span className="text-2xl font-semibold text-white">{area?.score ?? "—"}</span>
                  </div>
                  <p className="mt-3 font-semibold text-white">{label}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{area?.coachingGoal ?? "No reliable measurement for this zone."}</p>
                </button>
              );
            })}
          </div>

          {repeatability ? (
            <div className={`mt-4 rounded-2xl border p-5 ${tone(repeatability).bg}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${tone(repeatability).text}`}>Whole-chain repeatability</p>
                  <p className="mt-2 font-semibold text-white">{repeatability.coachingGoal}</p>
                </div>
                <p className="text-3xl font-semibold text-white">{repeatability.score}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
