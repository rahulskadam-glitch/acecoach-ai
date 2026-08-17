import { MailCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { cn } from "@/lib/utils";

const emailProviders = [
  { label: "Open Gmail", href: "https://mail.google.com" },
  { label: "Open Outlook", href: "https://outlook.live.com" },
  { label: "Open Yahoo Mail", href: "https://mail.yahoo.com" },
];

export default function SignupSuccessPage() {
  return (
    <JourneyShell current="auth" showProgress={false}>
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><MailCheck className="h-8 w-8 text-emerald-700" /></div>
        <h1 className="text-3xl font-bold text-slate-950">Account created</h1>
        <p className="mt-4 text-slate-700">We sent a verification link to your email address.</p>
        <p className="mt-2 text-slate-600">Confirm your email, then return to Athlentra Tennis and sign in.</p>
        <div className="mt-8 grid gap-3">
          {emailProviders.map(({ label, href }) => <a key={href} href={href} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl border-slate-300 bg-white text-slate-800 hover:bg-slate-50")}>{label}</a>)}
          <Link href="/auth" className={cn(buttonVariants(), "h-11 rounded-xl bg-[#123049] text-white hover:bg-[#1a4060]")}>Back to sign in</Link>
        </div>
      </div>
    </JourneyShell>
  );
}
