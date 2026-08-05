import { MailCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emailProviders = [
  { label: "Open Gmail", href: "https://mail.google.com" },
  { label: "Open Outlook", href: "https://outlook.live.com" },
  { label: "Open Yahoo Mail", href: "https://mail.yahoo.com" },
];

export default function SignupSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] px-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"><MailCheck className="h-8 w-8 text-emerald-400" /></div>
        <h1 className="text-3xl font-bold text-white">Account created</h1>
        <p className="mt-4 text-slate-300">We sent a verification link to your email address.</p>
        <p className="mt-2 text-slate-400">Confirm your email, then return to AceCoach AI and sign in.</p>
        <div className="mt-8 grid gap-3">
          {emailProviders.map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10")}>
              {label}
            </a>
          ))}
          <Link href="/login" className={cn(buttonVariants(), "h-11 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400")}>Back to login</Link>
        </div>
      </div>
    </main>
  );
}
