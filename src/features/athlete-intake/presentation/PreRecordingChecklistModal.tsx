"use client";

import {
  Camera,
  CheckCircle2,
  Eye,
  Images,
  Maximize2,
  Sparkles,
  User,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

type Props = {
  isOpen: boolean;
  targetAction: "camera" | "upload" | null;
  cameraAngle: string;
  strokeLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function PreRecordingChecklistModal({
  isOpen,
  targetAction,
  cameraAngle,
  strokeLabel,
  onClose,
  onConfirm,
}: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen || !targetAction) return null;

  function handleConfirm() {
    if (dontShowAgain) {
      try {
        sessionStorage.setItem("athlentra_skip_recording_checklist", "true");
      } catch {
        // storage ignored
      }
    }
    onConfirm();
  }

  const cameraAngleDisplay = {
    side: "Side View (90° to Baseline)",
    rear: "Rear View (Behind Baseline)",
    front: "Front View (Facing Player)",
    diagonal: "Diagonal / 45° Angle",
    unknown: "Standard View",
  }[cameraAngle] || "Side View";

  const checklistItems = [
    {
      title: "Distance & Height: 15–20 ft (4.5–6m)",
      detail: "Position camera 4.5–6m away at chest or waist height (3–4 ft / 1.0–1.2m tripod).",
      icon: Maximize2,
      badge: "Distance",
      highlight: "15–20 ft",
    },
    {
      title: "Court Lines Visible for 3D Scale",
      detail: "Frame baseline or alley lines so AI can calibrate exact 3D court geometry and ball speed.",
      icon: Eye,
      badge: "Court Scale",
      highlight: "Court Lines",
    },
    {
      // Deliberately instructed above the real gate: analysis_control_policy.json's
      // minimum_repetitions_for_score is 3, not 4. Asking for 4 buys a buffer against
      // one occluded/dropped repetition — this is not a mismatch to reconcile down to 3.
      title: "4 Clean Repetitions (10–25s)",
      detail: "Capture 4 consecutive natural strokes without dead time or ball retrieval.",
      icon: Video,
      badge: "Consistency",
      highlight: "4 Swings",
    },
    {
      title: "Solo Athlete in View (1 Person)",
      detail: "Ensure no other players, balls, or coaches cross the background hitting zone.",
      icon: User,
      badge: "Tracking",
      highlight: "1 Person",
    },
    {
      title: "High Frame Rate & Clarity",
      detail: "Set phone to 1080p 60 FPS or 120 FPS in good lighting to capture crisp racket whip.",
      icon: Zap,
      badge: "60–120 FPS",
      highlight: "60 FPS",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#09131e]/98 p-6 text-white shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150 z-10 overflow-hidden">
        {/* Glow Header */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-ath-lime/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-ath-sky/20 blur-3xl" />

        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ath-lime/15 text-ath-lime ring-1 ring-ath-lime/30">
            {targetAction === "camera" ? <Camera className="h-5 w-5" /> : <Images className="h-5 w-5" />}
          </div>
          <div>
            <span className="rounded bg-ath-lime px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-ath-navy">
              IDEAL VIDEO CHECKLIST
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              Before you {targetAction === "camera" ? "Record" : "Upload"} {strokeLabel || "Your Stroke"}
            </h3>
          </div>
        </div>

        {/* Target Angle Banner */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs">
          <span className="text-slate-400">Target Camera Angle:</span>
          <span className="font-bold text-ath-sky flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {cameraAngleDisplay}
          </span>
        </div>

        {/* Checklist Grid */}
        <div className="mt-4 space-y-2.5">
          {checklistItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-ath-lime/30 hover:bg-white/[0.06]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-ath-lime text-ath-navy text-xs font-black mt-0.5">
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white">{idx + 1}. {item.title}</h4>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.55rem] font-bold text-slate-300 uppercase">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[0.72rem] text-slate-300 leading-relaxed mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Options & CTA */}
        <div className="mt-5 space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-ath-lime focus:ring-0"
            />
            <span>Don&apos;t show this checklist again this session</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ath-lime to-[#c4ce1f] text-xs font-black text-ath-navy shadow-lg shadow-ath-lime/20 transition hover:opacity-95 active:scale-95"
            >
              {targetAction === "camera" ? (
                <>
                  <Camera className="h-4 w-4" />
                  <span>I&apos;m Ready · Record</span>
                </>
              ) : (
                <>
                  <Images className="h-4 w-4" />
                  <span>I&apos;m Ready · Select</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
