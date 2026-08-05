import { ArrowUpRight, PlayCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/70 px-6 py-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[1.5rem] border border-white/10 bg-slate-900/70 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">AceCoach AI</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
            Elevate your game with sport-specific AI coaching that turns every video into clear, actionable insight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#hero"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <PlayCircle className="h-4 w-4" />
            Watch demo
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Start now
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
