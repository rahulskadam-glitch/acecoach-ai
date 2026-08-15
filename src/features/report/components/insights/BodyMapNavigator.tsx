"use client";

type RegionStatus = "strength" | "developing" | "priority" | "needs_confirmation" | "not_visible";

export type BodyMapRegion = {
  id: string;
  title: string;
  status: RegionStatus;
};

const STATUS_FILL: Record<RegionStatus, { fill: string; stroke: string }> = {
  strength: { fill: "#10b981", stroke: "#34d399" },
  developing: { fill: "#3b82f6", stroke: "#60a5fa" },
  priority: { fill: "#f59e0b", stroke: "#fbbf24" },
  needs_confirmation: { fill: "#8b5cf6", stroke: "#a78bfa" },
  not_visible: { fill: "#cbd5e1", stroke: "#94a3b8" },
};

type Hotspot = { id: string; cx: number; cy: number; r: number };

const HOTSPOTS: Hotspot[] = [
  { id: "head", cx: 90, cy: 30, r: 17 },
  { id: "backlift", cx: 90, cy: 66, r: 15 },
  { id: "hands", cx: 33, cy: 118, r: 13 },
  { id: "grip", cx: 147, cy: 118, r: 13 },
  { id: "hips", cx: 90, cy: 135, r: 15 },
  { id: "knees", cx: 90, cy: 190, r: 14 },
  { id: "feet", cx: 90, cy: 246, r: 13 },
  { id: "finish", cx: 148, cy: 55, r: 13 },
];

/**
 * Clickable body-map hub. Each zone is colored by the engine's body-region
 * status and selects the matching coaching chapter — turning the body map
 * from a static diagram into the report's navigation surface.
 */
export default function BodyMapNavigator({ regions, selectedId, onSelect }: {
  regions: BodyMapRegion[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(regions.map((region) => [region.id, region]));
  const skeletonStroke = "#cbd5e1";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox="0 0 180 270" className="mx-auto h-56 w-auto" role="group" aria-label="Body map: select a coaching chapter">
        {/* Neutral skeleton scaffold */}
        <g stroke={skeletonStroke} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.75">
          <line x1="90" y1="47" x2="90" y2="135" />
          <line x1="90" y1="70" x2="40" y2="112" />
          <line x1="90" y1="70" x2="140" y2="112" />
          <line x1="90" y1="135" x2="70" y2="188" />
          <line x1="90" y1="135" x2="110" y2="188" />
          <line x1="70" y1="188" x2="66" y2="240" />
          <line x1="110" y1="188" x2="114" y2="240" />
        </g>
        {/* Finish arc hint */}
        <path d="M 120 100 Q 165 85 150 42" stroke={skeletonStroke} strokeWidth="2.5" strokeDasharray="4 4" fill="none" opacity="0.6" />
        {HOTSPOTS.map((spot) => {
          const region = byId.get(spot.id);
          if (!region) return null;
          const palette = STATUS_FILL[region.status];
          const selected = selectedId === spot.id;
          return (
            <g key={spot.id} onClick={() => onSelect(spot.id)} className="cursor-pointer" role="button" tabIndex={0} aria-label={`${region.title} — ${region.status.replaceAll("_", " ")}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(spot.id); } }}>
              {selected ? <circle cx={spot.cx} cy={spot.cy} r={spot.r + 5} fill="none" stroke="#173F6A" strokeWidth="2.5" strokeDasharray="3 3" /> : null}
              <circle cx={spot.cx} cy={spot.cy} r={spot.r} fill={palette.fill} fillOpacity={selected ? 0.9 : 0.7} stroke={palette.stroke} strokeWidth="2.5" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.6rem] font-semibold uppercase tracking-wide">
        <span className="inline-flex items-center gap-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Keep</span>
        <span className="inline-flex items-center gap-1 text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-500" />Watch</span>
        <span className="inline-flex items-center gap-1 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Fix</span>
        <span className="inline-flex items-center gap-1 text-violet-700"><span className="h-2 w-2 rounded-full bg-violet-500" />Confirm</span>
        <span className="inline-flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-300" />Not clear</span>
      </div>
    </div>
  );
}
