import ContextualPageShell from "@/components/layout/ContextualPageShell";

export default function PrivacyPage() {
  return (
    <ContextualPageShell maxWidth="max-w-5xl">
      <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Privacy and data</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">Your videos remain yours</h1>
        <div className="mt-8 grid gap-6 text-sm leading-7 text-slate-600 md:grid-cols-2">
          <section><h2 className="text-lg font-semibold text-slate-950">Private by default</h2><p className="mt-2">Uploaded videos are stored privately. Athlentra uses signed, time-limited access for analysis and playback.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Separate choices</h2><p className="mt-2">Processing consent is separate from optional product-improvement consent. Raw video is never used for improvement without your explicit permission.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Protected account data</h2><p className="mt-2">Reports, practice history, and coaching conversations are tied to your account and protected by ownership checks.</p></section>
          <section><h2 className="text-lg font-semibold text-slate-950">Deletion controls</h2><p className="mt-2">Delete individual videos from My Videos, or permanently delete your account and associated coaching data from Account.</p></section>
        </div>
      </article>
    </ContextualPageShell>
  );
}
