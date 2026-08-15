import ContextualPageShell from "@/components/layout/ContextualPageShell";

export default function TermsPage() {
  return (
    <ContextualPageShell maxWidth="max-w-5xl">
      <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Terms of use</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">Clear boundaries for coaching</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <section><h2 className="text-lg font-semibold text-slate-950">Coaching, not medical advice</h2><p className="mt-2">Athlentra provides video-based tennis coaching support. It is not a medical, injury-diagnostic, officiating, or professional-certification service.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Player age</h2><p className="mt-2">Athlentra Tennis is for players aged 13 and older. A parent or guardian must approve analysis for players aged 13–17.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Measurement limits</h2><p className="mt-2">Estimates and proxies appear with their limitations. Unsupported conclusions are withheld rather than presented as fact.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Media rights</h2><p className="mt-2">You retain ownership of uploaded media and must have permission from anyone visible in it.</p></section>
        </div>
      </article>
    </ContextualPageShell>
  );
}
