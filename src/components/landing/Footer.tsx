import Link from "next/link";

export default function Footer() {
  return (
    <footer className="scroll-mt-24 border-t border-white/10 py-16 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">AceCoach AI</p>
          <p className="mt-6 max-w-sm text-sm leading-7 text-slate-400">
            The premium multi-sport motion intelligence platform for athletes, coaches, and academies that demand modern performance insights.
          </p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Product</p>
          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="transition hover:text-white">
                How It Works
              </a>
            </li>
            <li>
              <a href="#pricing" className="transition hover:text-white">
                Pricing
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Resources</p>
          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a href="#demo" className="transition hover:text-white">
                Demo Analysis
              </a>
            </li>
            <li>
              <a href="#testimonials" className="transition hover:text-white">
                Testimonials
              </a>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-white">
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Legal</p>
          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a href="#" className="transition hover:text-white">
                Privacy
              </a>
            </li>
            <li>
              <a href="#" className="transition hover:text-white">
                Terms
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row">
        <p>© 2026 AceCoach AI. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="#" className="transition hover:text-white">
            Twitter
          </a>
          <a href="#" className="transition hover:text-white">
            LinkedIn
          </a>
          <a href="#" className="transition hover:text-white">
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
