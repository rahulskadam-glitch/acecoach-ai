import Link from "next/link";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import JourneyShell from "@/features/journey/presentation/JourneyShell";

export default function ForgotPasswordPage() {
  return (
    <JourneyShell current="auth" showProgress={false}>
      <div className="mx-auto flex justify-center py-8">
        <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">Account recovery</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">Reset your password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter your email and we will send a secure link to choose a new password.</p>
          <div className="mt-7"><ForgotPasswordForm /></div>
          <Link href="/auth" className="mt-6 block text-center text-sm font-medium text-blue-800 hover:text-blue-950">Back to sign in</Link>
        </div>
      </div>
    </JourneyShell>
  );
}
