import Link from "next/link";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] px-6 py-10 text-white lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">AceCoach AI</Link>
        <Link href="/login" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
          Back to login
        </Link>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center py-12">
        <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Account recovery</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Enter your email and we will send you a secure link to choose a new password.
          </p>
          <div className="mt-7">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
