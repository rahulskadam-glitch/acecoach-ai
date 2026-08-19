import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950/60 text-emerald-400">
          <FileQuestion className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">404 · Not Found</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The requested session, report, or page could not be located or may have been moved.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
