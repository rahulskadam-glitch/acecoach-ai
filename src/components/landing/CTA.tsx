export default function CTA() {
  return (
    <section id="final-cta" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-white/10 bg-[#111827]/95 px-8 py-14 text-center shadow-[0_40px_120px_-60px_rgba(0,0,0,0.6)]">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Ready to unlock your best tennis?</p>
        <h2 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
          Upload your first tennis video today and discover how AI can transform your game.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Start with a single match and receive clear coaching recommendations that sharpen your strokes and accelerate progress.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/start"
            className="inline-flex rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Start Free Analysis
          </a>
          <a
            href="#features"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore features
          </a>
        </div>
      </div>
    </section>
  );
}
