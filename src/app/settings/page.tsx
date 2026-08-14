import { CreditCard, FileText, HelpCircle, MessageSquareHeart, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { requireUser } from "@/lib/supabase/server";

const accountLinks = [
  { href: "/profile", title: "Athlete profile", copy: "Sport context, level, goals, consent, and coaching preferences.", icon: UserRound },
  { href: "/pricing", title: "Plans and usage", copy: "Understand analysis limits and what each plan includes.", icon: CreditCard },
  { href: "/privacy", title: "Privacy and data", copy: "Review media ownership, consent, and data boundaries.", icon: ShieldCheck },
];

const helpLinks = [
  { href: "/feedback", title: "Give feedback", copy: "Rate AceCoach or suggest an improvement.", icon: MessageSquareHeart, featured: true },
  { href: "/support", title: "Support", copy: "Get help with a session, upload, or analysis problem.", icon: HelpCircle },
  { href: "/methodology", title: "How analysis works", copy: "Read measurement, confidence, and scientific boundaries.", icon: FileText },
];

export default async function SettingsPage() {
  await requireUser();
  return <JourneyShell current="coach" showProgress={false}>
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">Account</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Your controls and help</h1><p className="mt-3 text-sm leading-7 text-slate-600">Manage coaching context and privacy here. Product feedback and support are kept easy to reach without crowding the main player journey.</p></header>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-950">Account and experience</h2><div className="mt-4 grid gap-3">{accountLinks.map(({ href, title, copy, icon: Icon }) => <Link key={href} href={href} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Icon className="h-5 w-5" /></span><span><span className="block font-semibold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{copy}</span></span></Link>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-950">Feedback and help</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{helpLinks.map(({ href, title, copy, icon: Icon, featured }) => <Link key={href} href={href} className={`rounded-2xl border p-4 transition ${featured ? "border-violet-200 bg-violet-50 hover:border-violet-400" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"}`}><Icon className={`h-5 w-5 ${featured ? "text-violet-800" : "text-blue-800"}`} /><span className="mt-3 block font-semibold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{copy}</span></Link>)}</div></section>
    </div>
  </JourneyShell>;
}
