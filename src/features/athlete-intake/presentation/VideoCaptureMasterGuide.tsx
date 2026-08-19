"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileVideo,
  Info,
  Maximize2,
  Sun,
  User,
  Users,
  Video,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";

export type GuideSection = "dos" | "donts" | "specs" | "angles";

export default function VideoCaptureMasterGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideSection>("dos");

  const dosList = [
    {
      title: "Solo Athlete in Frame",
      detail: "Ensure only ONE person is visible. Other players walking in the background can distort AI pose tracking.",
      icon: User,
      badge: "Critical",
    },
    {
      title: "Full Body Visible (Head to Toe)",
      detail: "Keep your entire body in frame from preparation coil to finish. Never crop out your feet or racket finish.",
      icon: Maximize2,
      badge: "Kinematics",
    },
    {
      title: "Court Lines Visible for Scale",
      detail: "Include baseline or court alley lines in the frame so AI can calibrate exact 3D court distance and ball trajectory.",
      icon: Eye,
      badge: "Calibration",
    },
    {
      title: "Optimal Distance (15–20 ft) & Height",
      detail: "Place the camera 4.5–6 meters away at chest or waist height (3–4 ft / 1–1.2m tripod).",
      icon: Camera,
      badge: "Perspective",
    },
    {
      title: "High Frame Rate (60fps or 120fps)",
      detail: "60fps or 120fps captures racket whip and impact without blur. 30fps is supported but 60fps is optimal.",
      icon: Zap,
      badge: "Precision",
    },
    {
      title: "4 Clean Repetitions (10–25 Seconds)",
      detail: "Capturing 3 to 5 natural repetitions (at least 4 recommended) allows the AI to analyze stroke repeatability, rhythm consistency, and eliminate single-shot flukes.",
      icon: Video,
      badge: "Consistency",
    },
  ];

  const dontsList = [
    {
      title: "No Multiple People in View",
      detail: "Don't let coaches, friends, or opponents stand directly behind or cross the hitting corridor.",
      icon: Users,
      risk: "Confuses 33-point pose keypoints",
    },
    {
      title: "No Cropped Limbs or Racket",
      detail: "Don't position the camera so close that the racket head or feet leave the frame during loading or follow-through.",
      icon: XCircle,
      risk: "Prevents full angular measurement",
    },
    {
      title: "No Extreme High/Low Angles",
      detail: "Don't rest the phone on the ground pointing up or high on the fence pointing steeply down.",
      icon: AlertTriangle,
      risk: "Distorts joint angles and posture",
    },
    {
      title: "No Direct Sunlight Glare",
      detail: "Avoid shooting directly into blinding backlighting or dark shadows. Keep court evenly lit.",
      icon: Sun,
      risk: "Causes landmark occlusion",
    },
    {
      title: "No Long 5–10 Minute Clips",
      detail: "Don't upload unedited practice matches. Trim to 5–30 seconds focused purely on the stroke.",
      icon: FileVideo,
      risk: "Slows upload and analysis",
    },
  ];

  const specsMatrix = [
    {
      metric: "Repetitions & Duration",
      recommendation: "4 clean repetitions in 10 to 25 seconds",
      limit: "Max 30.25 seconds (1 to 6 repetitions)",
    },
    {
      metric: "File Size",
      recommendation: "15 MB – 45 MB (for 1080p 60fps)",
      limit: "Supported up to 500 MB",
    },
    {
      metric: "Resolution",
      recommendation: "1080p Full HD (or 4K)",
      limit: "Minimum 720p HD",
    },
    {
      metric: "Frame Rate",
      recommendation: "60 FPS or 120 FPS",
      limit: "Minimum 24 FPS (30 FPS standard)",
    },
    {
      metric: "Supported Formats",
      recommendation: "MP4 (H.264 / H.265) or MOV (Apple ProRes / QuickTime)",
      limit: "MP4, MOV, WebM, M4V",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl backdrop-blur-xl overflow-hidden text-white transition-all">
      {/* Header Banner */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.03] transition text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ath-lime/15 text-ath-lime ring-1 ring-ath-lime/30">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-ath-lime px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-wider text-ath-navy">
                RECORDING MASTER GUIDE
              </span>
              <span className="text-xs text-slate-400">Tennis Coach & Video Analytics Standards</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
              How to Record for 99%+ AI Biomechanical Accuracy
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-ath-lime">
          <span>{isOpen ? "Hide Guide" : "View Do's & Don'ts"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className="border-t border-white/10 p-4 sm:p-6 bg-slate-950/80 animate-in fade-in duration-200">
          {/* Segmented Navigation Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("dos")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition ${
                activeTab === "dos" ? "bg-ath-green text-black font-black shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>DO&apos;S (6 Best Practices)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("donts")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition ${
                activeTab === "donts" ? "bg-rose-500 text-white font-black shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              <XCircle className="h-4 w-4" />
              <span>DON&apos;TS (5 Mistakes to Avoid)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition ${
                activeTab === "specs" ? "bg-ath-sky text-slate-950 font-black shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              <Info className="h-4 w-4" />
              <span>Video Size & Specs</span>
            </button>
          </div>

          {/* Tab 1: DO'S */}
          {activeTab === "dos" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dosList.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-ath-green/20 bg-ath-green/[0.04] p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ath-green text-black text-xs font-black">
                            ✓
                          </span>
                          <span className="text-xs font-bold text-ath-green">{idx + 1}. {item.title}</span>
                        </div>
                        <span className="rounded bg-ath-green/20 px-1.5 py-0.5 text-[0.58rem] font-bold text-ath-green uppercase">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: DON'TS */}
          {activeTab === "donts" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dontsList.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-black">
                            ✕
                          </span>
                          <span className="text-xs font-bold text-rose-400">{idx + 1}. {item.title}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">{item.detail}</p>
                      <div className="mt-2.5 rounded bg-rose-950/60 border border-rose-500/30 px-2 py-1 text-[0.62rem] text-rose-300 font-semibold">
                        Impact: {item.risk}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: SPECS & SIZE MATRIX */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ath-sky mb-3">
                  Is 50 MB Sufficient?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Yes, 50 MB is more than enough for 95%+ of video uploads.</strong> A high-quality 10-second clip recorded in 1080p at 60 FPS is typically between <strong>20 MB and 40 MB</strong>. For athletes recording in 4K 60fps or 120fps on modern smartphones (iPhone 14/15/16 Pro, Samsung S23/S24), our cloud architecture supports file sizes up to <strong>500 MB</strong>.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 bg-white/5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3 text-ath-lime">Recommended (Optimal)</th>
                      <th className="p-3 text-slate-400">System Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {specsMatrix.map((spec) => (
                      <tr key={spec.metric} className="hover:bg-white/[0.02] transition">
                        <td className="p-3 font-semibold text-white">{spec.metric}</td>
                        <td className="p-3 text-slate-200 font-medium">{spec.recommendation}</td>
                        <td className="p-3 text-slate-400 font-mono text-[0.68rem]">{spec.limit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
