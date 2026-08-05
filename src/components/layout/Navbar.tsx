import { ArrowRight, Menu } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="#hero" className="flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <span className="text-lg font-semibold">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
              AceCoach AI
            </p>
            <p className="text-xs text-slate-500">Multi-sport motion intelligence</p>
          </div>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#" className="text-sm font-medium text-slate-300 transition hover:text-white">
            Login
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <button className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
