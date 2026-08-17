"use client";

import { ArrowRight, Camera, Check, Play, ShieldCheck, Sparkles, Star, Target, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Link from "next/link";
import AthlentraMark from "@/components/design-system/AthlentraMark";
import { selectJourneySport } from "@/app/actions/journey-actions";
import type { SportDefinition } from "@/lib/sports";

export default function SportSelectionLanding({ sports, authenticated }: { sports: SportDefinition[]; authenticated: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tennis = sports[0];

  async function startTennis() {
    setSelected(true);
    setError(null);
    try {
      await selectJourneySport(tennis.id);
      window.localStorage.setItem("acecoach-selected-sport", tennis.id);
      router.push(authenticated ? `/start?sport=${tennis.id}` : `/auth?sport=${tennis.id}&next=/start`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start your analysis.");
      setSelected(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#123049] text-white">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <AthlentraMark inverse />
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition flex items-center gap-1.5"
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>Pricing & Reviews</span>
          </Link>
          {authenticated ? (
            <Link
              href="/settings"
              className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition flex items-center"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/auth"
              className="min-h-11 rounded-full px-4 py-3 text-sm font-semibold text-white/75 hover:text-white flex items-center"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={startTennis}
            disabled={selected}
            className="min-h-11 rounded-full bg-[#d7e022] px-5 text-sm font-bold text-[#123049] hover:bg-white disabled:opacity-60 transition"
          >
            {authenticated ? "Dashboard" : "Start"}
          </button>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-20">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d7e022]"><Sparkles className="h-4 w-4" />Your tennis. Made visible.</p>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">See the stroke.<br /><span className="text-[#8AD8FF]">Train the change.</span></h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-300">Turn a short phone video into one clear focus, the moment it happens, and a drill for your next session.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={startTennis} disabled={selected} className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#d7e022] px-7 font-bold text-[#123049] shadow-2xl shadow-lime-300/10 hover:bg-white disabled:cursor-wait disabled:opacity-60">{selected ? "Opening…" : "Analyze a stroke"}<ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></button>
            <a href="#how" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 font-semibold text-white hover:bg-white/10"><Play className="h-4 w-4" />How it works</a>
          </div>
          {error ? <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d7e022]" />No sensors</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#d7e022]" />One phone</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d7e022]" />Your video, your control</span>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md">
          <div className="absolute -inset-8 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-[#0C263C] p-3 shadow-2xl">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_15%,rgba(59,216,164,.35),transparent_34%),linear-gradient(180deg,#123852_0%,#081a2b_100%)] p-5">
              <div className="absolute inset-x-8 bottom-8 top-24 border border-white/15 [transform:perspective(500px)_rotateX(58deg)]"><div className="absolute inset-x-0 top-1/2 border-t border-white/20" /><div className="absolute bottom-0 left-1/2 top-0 border-l border-white/20" /></div>
              <div className="relative flex items-center justify-between text-xs font-semibold text-white/60"><span>FOREHAND</span><span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-emerald-200">Report ready</span></div>
              <svg viewBox="0 0 260 270" className="relative mx-auto mt-6 h-[55%] w-full" aria-hidden="true">
                <path d="M53 223 C67 165 92 122 126 105 C163 86 196 101 218 137" fill="none" stroke="#d7e022" strokeWidth="4" strokeLinecap="round" strokeDasharray="7 10" />
                <circle cx="122" cy="70" r="19" fill="#8AD8FF" /><path d="M122 90 L117 153 M118 113 L77 139 M119 112 L167 91 M117 151 L82 218 M117 151 L157 217" fill="none" stroke="#F8FAFC" strokeWidth="9" strokeLinecap="round" /><path d="M167 91 L212 67" stroke="#d7e022" strokeWidth="7" strokeLinecap="round" /><ellipse cx="222" cy="61" rx="15" ry="26" fill="none" stroke="#d7e022" strokeWidth="5" transform="rotate(52 222 61)" />
              </svg>
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-[#123049]/90 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8AD8FF]">Your focus</p>
                <p className="mt-2 text-lg font-semibold">Create space before the swing</p>
                <p className="mt-2 text-sm text-slate-300">Cue: “Turn, then let the racket go.”</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#f3f6f2] px-5 py-16 text-slate-950 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2fa87f]">From court to clarity</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">One stroke. Three simple steps.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: Target, n: "01", title: "Pick your stroke", copy: "Forehand, backhand, serve, volley, slice, overhead, or movement." },
              { icon: Camera, n: "02", title: "Record 2–5 reps", copy: "Landscape. Full body and racket visible. Thirty seconds or less." },
              { icon: Sparkles, n: "03", title: "Train one change", copy: "See the key moment, use one cue, and take the drill to court." },
            ].map(({ icon: Icon, n, title, copy }) => <article key={n} className="ath-card p-6"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-[#2fa87f]" /><span className="text-sm font-bold text-slate-300">{n}</span></div><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></article>)}
          </div>
        </div>
      </section>

      {/* Verified Player & Coach Reviews Section */}
      <section className="bg-[#0b1e30] px-5 py-16 text-white sm:px-8 sm:py-24 border-t border-white/10">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/25 px-4 py-1.5 text-xs font-bold text-amber-300">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span>4.9 / 5.0 Rating from 2,400+ Athletes & Coaches</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Loved by League Players & Tour Coaches
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
              Real results from USTA competitors, high school athletes, and certified teaching pros.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                className="relative flex flex-col justify-between rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-md hover:border-white/25 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="rounded-full bg-[#d7e022]/15 px-2.5 py-0.5 text-[0.65rem] font-bold text-[#d7e022]">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{item.author}</div>
                    <div className="text-[0.68rem] text-slate-400">{item.role} &bull; {item.location}</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-300">
                    Verified Player
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d7e022] px-8 text-sm font-black text-[#123049] hover:bg-white transition shadow-lg shadow-lime-300/10"
            >
              <span>View All Pricing & 1st Month Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
