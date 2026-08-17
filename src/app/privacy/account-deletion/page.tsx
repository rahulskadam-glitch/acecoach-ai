import Link from "next/link";
import { ArrowLeft, ShieldAlert, Trash2, CheckCircle2, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account & Data Deletion | Athlentra Tennis",
  description: "Request deletion of your Athlentra Tennis account, personal data, video uploads, and biomechanical analysis history.",
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-rose-500 selection:text-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Athlentra
        </Link>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30 shadow-lg shadow-rose-500/20 mb-6">
          <Trash2 className="h-7 w-7" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Account & Data Deletion Request
        </h1>
        <p className="mt-3 text-base text-slate-400 leading-relaxed">
          In compliance with Apple App Store Guideline 5.1.1(v) and the Google Play Store Data Safety Policy, Athlentra Tennis provides a simple, transparent process to permanently delete your account and all associated personal data.
        </p>

        {/* Option 1: In-App Instant Deletion */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold ring-1 ring-emerald-500/30">
              1
            </span>
            <h2 className="text-xl font-bold text-white">Instant In-App Deletion (Recommended)</h2>
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            If you have access to the app or web portal, you can permanently delete your account in seconds:
          </p>
          <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal list-inside">
            <li>Log in to Athlentra Tennis.</li>
            <li>Go to <strong className="text-white">Profile</strong> or <strong className="text-white">Settings</strong>.</li>
            <li>Scroll down to the <strong className="text-rose-400">Delete Account and Personal Data</strong> section.</li>
            <li>Click <strong className="text-rose-400">Delete account</strong>, type <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">DELETE</code> to confirm, and submit.</li>
          </ol>
        </section>

        {/* Option 2: Web & Email Deletion Request */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold ring-1 ring-sky-500/30">
              2
            </span>
            <h2 className="text-xl font-bold text-white">Manual Request via Email</h2>
          </div>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            If you no longer have the app installed or cannot log in, email our Data Privacy Officer to request complete data erasure:
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-sky-400" />
              <span className="font-mono text-sm text-sky-300 font-bold">privacy@athlentra.com</span>
            </div>
            <a
              href="mailto:privacy@athlentra.com?subject=Account%20and%20Data%20Deletion%20Request"
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Send Request
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Please email us from the email address registered with your Athlentra account. Requests are processed within 48 hours.
          </p>
        </section>

        {/* What Data is Deleted */}
        <section className="mt-8 rounded-3xl border border-rose-500/20 bg-rose-950/10 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="text-lg font-bold">What Happens When You Delete Your Account</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Account Credentials:</strong> Login identifiers, email, and passwords are deleted immediately.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Uploaded Media:</strong> All video clips, stroke recordings, and raw files are purged from cloud storage.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Analysis & Telemetry:</strong> All biomechanical reports, 3D kinematic telemetry data, and practice plans are erased.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Coaching Conversations:</strong> All Coach AI chats and history are deleted.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
