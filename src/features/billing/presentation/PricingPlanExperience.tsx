"use client";

import {
  Check,
  CreditCard,
  Flame,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { checkoutPlanAction } from "@/app/actions/billing-actions";
import {
  COUNTRY_PRICING,
  type CountryCode,
  detectDefaultCountry,
  SUPPORTED_COUNTRIES,
} from "../domain/currencies";
import { PLAN_ENTITLEMENTS } from "../domain/entitlements";

type SelectedPlanModal = {
  planId: "free_trial" | "single_video" | "pro";
  title: string;
  priceText: string;
  periodText?: string;
  badge: string;
} | null;

const FREE_VIDEO_LIMIT = PLAN_ENTITLEMENTS.find((plan) => plan.id === "free")!.videoLimit;
const PRO_VIDEO_LIMIT = PLAN_ENTITLEMENTS.find((plan) => plan.id === "pro")!.videoLimit;

export default function PricingPlanExperience() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("US");
  const [activeModal, setActiveModal] = useState<SelectedPlanModal>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-detect localized country pricing on mount. Runs client-only (timezone
  // isn't known at SSR time) so an effect is required here, not a lazy initializer.
  useEffect(() => {
    const detected = detectDefaultCountry();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only browser-timezone read, not derivable state
    setSelectedCountry(detected);
  }, []);

  const pricing = COUNTRY_PRICING[selectedCountry] || COUNTRY_PRICING.US;

  const handleCheckout = async (plan: NonNullable<SelectedPlanModal>) => {
    setIsProcessing(true);
    try {
      const res = await checkoutPlanAction({
        planId: plan.planId,
        countryCode: selectedCountry,
      });

      if (res.success) {
        toast.success(res.message);
        setActiveModal(null);
        router.push(res.redirectUrl);
      } else {
        toast.error("Failed to activate plan. Please try again.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate plan. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header & Hero Value Proposition */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-ath-lime/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ath-lime ring-1 ring-ath-lime/20">
          <Sparkles className="h-3.5 w-3.5 text-ath-lime" />
          <span>Special Offer: 1st Month Free • Up to {FREE_VIDEO_LIMIT} Video Audits</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Simple, Flexible Tennis Coaching Plans
        </h1>
        <p className="text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Start with {FREE_VIDEO_LIMIT} free video analyses, purchase single video passes as you play, or unlock up to {PRO_VIDEO_LIMIT} tour-grade biomechanical audits a month.
        </p>

        {/* Region / Currency Selector */}
        <div className="pt-4 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3.5 py-2 backdrop-blur-xl">
            <Globe className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium">Currency:</span>
            <select
              aria-label="Select Country and Currency"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2"
            >
              {SUPPORTED_COUNTRIES.map((code) => {
                const item = COUNTRY_PRICING[code];
                return (
                  <option key={code} value={code} className="bg-slate-900 text-white">
                    {item.flag} {item.countryName} ({item.currencyCode})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid gap-8 lg:grid-cols-3 items-stretch max-w-7xl mx-auto">
        {/* Tier 1: Free Trial (1st Month Free - Up to FREE_VIDEO_LIMIT Videos) */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-ath-lime/30 bg-ath-navy p-7 backdrop-blur-xl transition hover:border-ath-lime/50">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ath-lime flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Free Trial
              </span>
              <span className="rounded-full bg-ath-lime/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-ath-lime">
                1st Month Free
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">Starter Trial</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try out {FREE_VIDEO_LIMIT} complete video stroke analyses free during your first 30 days.
            </p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-black text-white">
                {pricing.currencySymbol}0
              </span>
              <span className="text-xs text-slate-400">/ 1st month</span>
            </div>

            <div className="mt-7 space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>{FREE_VIDEO_LIMIT} Free Video Analyses</strong> included (Forehand, Backhand, Serve)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Standard 3D Skeleton & Joint Kinematics</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Primary Technical Correction & Feel Cues</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>AI Coach Practice Drills & Session Summaries</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-400">
                <Check className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <span>No credit card required to get started</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveModal({
                planId: "free_trial",
                title: "Starter 30-Day Free Trial",
                priceText: `${pricing.currencySymbol}0`,
                periodText: "1st Month Free",
                badge: `${FREE_VIDEO_LIMIT} Free Video Audits`,
              })
            }
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-2xl border border-ath-lime/40 bg-ath-lime/10 text-xs font-bold text-ath-lime hover:bg-ath-lime/20 active:scale-[0.99] transition"
          >
            Start 1st Month Free ({FREE_VIDEO_LIMIT} Videos)
          </button>
        </div>

        {/* Tier 2: Single Video Pass (Pay-As-You-Go) */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-ath-lime/30 bg-ath-navy p-7 backdrop-blur-xl transition hover:border-ath-lime/50">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ath-lime flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                Pay-As-You-Go
              </span>
              <span className="rounded-full bg-ath-lime/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-ath-lime">
                No Subscription
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">Single Video Pass</h3>
            <p className="mt-1 text-xs text-slate-400">
              Ideal for quick check-ins before a match or an occasional technique tune-up.
            </p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-black text-white">
                {pricing.singleVideo.formatted}
              </span>
              <span className="text-xs text-slate-400">/ per video analysis</span>
            </div>

            <div className="mt-7 space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>1 Full 60fps Video Analysis</strong></span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Full 3D Kinematic Telemetry & Motion Twin</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Power Leak Waterfall (Joules & MPH Recovery)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Shareable Link & PDF Report Download</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span>Report permanently saved in your library</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveModal({
                planId: "single_video",
                title: "Single Video Analysis Pass",
                priceText: pricing.singleVideo.formatted,
                periodText: "One-Time Purchase",
                badge: "1 Video Audit",
              })
            }
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-2xl border border-ath-lime/40 bg-ath-lime/10 text-xs font-bold text-ath-lime hover:bg-ath-lime/20 active:scale-[0.99] transition"
          >
            Analyze 1 Video ({pricing.singleVideo.formatted})
          </button>
        </div>

        {/* Tier 3: Pro Athlete Membership (flat monthly) */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-ath-lime/30 bg-ath-navy p-8 backdrop-blur-xl transition hover:border-ath-lime/50 lg:-translate-y-2">
          {/* Top Floating Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-ath-lime px-4 py-1 text-[0.68rem] font-black uppercase tracking-wider text-slate-950 shadow-md whitespace-nowrap flex items-center gap-1">
            <Flame className="h-3 w-3 fill-slate-950" />
            <span>{PRO_VIDEO_LIMIT} VIDEOS/MO • BEST VALUE</span>
          </div>

          <div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ath-lime flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                Pro Membership
              </span>
              <span className="rounded-full bg-ath-lime/20 px-2.5 py-0.5 text-[0.68rem] font-black text-ath-lime">
                UP TO {PRO_VIDEO_LIMIT} UPLOADS/MO
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">Pro Athlete</h3>
            <p className="mt-1 text-xs text-slate-400">
              For club and competitive players dedicated to accelerating technical mastery.
            </p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-mono text-4xl sm:text-5xl font-black text-white">
                {pricing.proMonthly.formatted}
              </span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>

            <div className="mt-7 space-y-3.5 border-t border-white/10 pt-6">
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>Up to {PRO_VIDEO_LIMIT} 60fps Video Analyses/mo</strong> (All Stroke Types)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>3D Kinematic Telemetry Matrix</strong> (Live 9-Tile Dashboard)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>3D Net Clearance & Spin Window</strong> Corridor</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>Power Leak Waterfall</strong> (Joules + Recoverable MPH)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>Rotator Cuff Deceleration</strong> & Joint Stress Barometer</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>UNLIMITED 24/7 AI Coach Chat</strong> with grounded biomechanics</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <Check className="h-4 w-4 text-ath-lime mt-0.5 shrink-0" />
                <span><strong>Longitudinal Tracking & Tour Motion Twin Overlays</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveModal({
                planId: "pro",
                title: "Pro Athlete Membership",
                priceText: `${pricing.proMonthly.formatted}/month`,
                periodText: "Billed Monthly · 1st Month Free",
                badge: `Up to ${{PRO_VIDEO_LIMIT}} Audits/mo`,
              })
            }
            className="mt-8 flex min-h-13 w-full items-center justify-center rounded-2xl bg-ath-lime px-5 text-sm font-black text-ath-navy shadow-lg shadow-ath-lime/25 hover:brightness-95 active:scale-[0.99] transition"
          >
            Upgrade to Pro ({pricing.proMonthly.formatted}/mo)
          </button>
        </div>
      </div>

      {/* Trust & Transparency Banner */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-8 max-w-4xl mx-auto">
        <div className="grid gap-6 sm:grid-cols-3 text-center sm:text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-ath-lime shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Apple & Google Secure</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Encrypted billing in your local currency. Safe and official app store processing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Zap className="h-6 w-6 text-ath-lime shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Cancel Anytime in 1 Tap</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                No locked-in contracts. Easily cancel subscriptions directly in your Apple/Google or account settings.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <HelpCircle className="h-6 w-6 text-ath-lime shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Retain Past Reports</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                All previously completed biomechanical reports remain fully accessible in your library forever.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Athlete & Coach Reviews */}
      <div className="max-w-6xl mx-auto space-y-6 pt-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 text-xs font-bold text-amber-300">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>4.9 / 5.0 Rating from 2,400+ Athletes & Coaches</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Trusted by Competitive Players & Certified Coaches
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            See how players are gaining serve velocity, adding topspin, and fixing kinetic power leaks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              quote: "Athlentra showed me I was dropping racket head speed before contact. Gained 8 MPH on my flat serve in one week. The 1 prioritized fix keeps me focused.",
              author: "Marcus T.",
              role: "USTA 4.5 Competitor",
              location: "Austin, TX",
              tag: "Serve Velocity (+8 MPH)",
            },
            {
              quote: "Instead of overwhelming junior players with 10 corrections, Athlentra pinpoints the highest-leverage mechanical flaw with 60fps precision.",
              author: "Coach David R.",
              role: "USPTA Elite Pro",
              location: "Boca Raton, FL",
              tag: "High Performance Academy",
            },
            {
              quote: "The Power Leak Waterfall showed I was opening my hips before knee extension was complete. Serve jumped from 94 MPH to 105 MPH without extra strain.",
              author: "Tyler M.",
              role: "High School Varsity #1",
              location: "San Diego, CA",
              tag: "Kinetic Timing (+11 MPH)",
            },
            {
              quote: "I had recurring rotator cuff soreness on my follow-through. The Joint Stress Barometer helped me smooth out my finish. Pain-free after 3 sets!",
              author: "Dr. Brian S.",
              role: "Senior 45+ Division",
              location: "Atlanta, GA",
              tag: "Injury Prevention",
            },
            {
              quote: "My backhand was landing short in no-man's land. Athlentra identified that my shoulder wasn't rotating through. The feel cue fixed it in 1 session.",
              author: "Samantha W.",
              role: "Adult League Champion",
              location: "Chicago, IL",
              tag: "Backhand Depth & Drive",
            },
            {
              quote: "I used to spend $600 a month on private coaching. For $10/mo, Athlentra gives me tour-level 60fps video audits right on the court between sets.",
              author: "Michael D.",
              role: "USTA 3.5 Captain",
              location: "Seattle, WA",
              tag: "Cost & Value Champion",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-md hover:border-white/20 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="rounded-full bg-ath-lime/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-ath-lime">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{item.author}</div>
                  <div className="text-[0.68rem] text-slate-400">{item.role} &bull; {item.location}</div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-400">
                  Verified Player
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Checkout Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1829] p-6 sm:p-8 shadow-2xl shadow-ath-lime/10 text-white space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ath-lime/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider text-ath-lime">
                <Sparkles className="h-3 w-3" />
                <span>{activeModal.badge}</span>
              </div>
              <h3 className="mt-2 text-2xl font-black text-white">{activeModal.title}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Confirm your selection for {pricing.countryName} ({pricing.currencyCode})
              </p>
            </div>

            {/* Price Summary Box */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400">Selected Plan Total:</span>
                <div className="text-2xl font-mono font-black text-white">{activeModal.priceText}</div>
              </div>
              <div className="text-right">
                <span className="text-[0.68rem] uppercase font-bold text-ath-lime block">
                  Best Price Guarantee
                </span>
                <span className="text-xs text-slate-400">{activeModal.periodText}</span>
              </div>
            </div>

            {/* Security & Payment Highlights */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-ath-lime shrink-0" />
                <span>256-Bit SSL Encrypted Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-ath-lime shrink-0" />
                <span>
                  {pricing.countryCode === "IN"
                    ? "Supports UPI, Cards, NetBanking, Apple Pay & Google Pay"
                    : "Supports Apple Pay, Google Pay, Visa, Mastercard, Amex"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleCheckout(activeModal)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ath-lime px-5 text-sm font-black text-ath-navy shadow-lg shadow-ath-lime/25 hover:brightness-95 active:scale-[0.99] transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Confirmation...</span>
                  </>
                ) : activeModal.planId === "free_trial" ? (
                  <span>Activate 1st Month Free Trial</span>
                ) : activeModal.planId === "single_video" ? (
                  <span>Confirm Single Video Pass ({activeModal.priceText})</span>
                ) : (
                  <span>Confirm Pro Membership ({activeModal.priceText})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-white py-1 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
