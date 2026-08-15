import { ArrowRight, CreditCard, FileText, HelpCircle, MessageSquareHeart, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { updateReminderPreference } from "@/app/actions/notification-actions";
import SignOutButton from "@/components/auth/SignOutButton";
import DeleteAccountButton from "@/components/auth/DeleteAccountButton";
import AthleteWorkspaceShell from "@/components/layout/AthleteWorkspaceShell";
import WorkspacePageHeader from "@/components/layout/WorkspacePageHeader";
import { getUserProfile, requireUser } from "@/lib/supabase/server";

const accountLinks = [
  { href: "/profile", title: "Athlete profile", copy: "Sport context, level, goals, consent, and coaching preferences.", icon: UserRound },
  { href: "/pricing", title: "Plans and usage", copy: "Understand analysis limits and what each plan includes.", icon: CreditCard },
  { href: "/privacy", title: "Privacy and data", copy: "Review media ownership, consent, and data boundaries.", icon: ShieldCheck },
];

const helpLinks = [
  { href: "/feedback", title: "Give feedback", copy: "Rate Athlentra or suggest an improvement.", icon: MessageSquareHeart, featured: true },
  { href: "/support", title: "Support", copy: "Get help with a session, upload, or analysis problem.", icon: HelpCircle },
  { href: "/methodology", title: "How analysis works", copy: "Read measurement, confidence, and scientific boundaries.", icon: FileText },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const { profile } = await getUserProfile(user.id);
  const reminderEmailsEnabled = profile?.reminder_emails_enabled !== false;

  return <AthleteWorkspaceShell>
    <div className="mx-auto max-w-4xl space-y-6">
      <WorkspacePageHeader eyebrow="Account" title="Your profile and privacy" description="Update your coaching details, review your plan, or get help. Security actions stay together at the bottom of this page." />
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="account-settings-heading"><h2 id="account-settings-heading" className="px-6 pb-3 pt-6 text-lg font-semibold text-slate-950">Settings</h2><div>{accountLinks.map(({ href, title, copy, icon: Icon }) => <Link key={href} href={href} className="group flex items-center gap-4 border-t border-slate-100 px-6 py-4 transition hover:bg-slate-50"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-950">{title}</span><span className="mt-0.5 block text-sm leading-6 text-slate-600">{copy}</span></span><ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-800" /></Link>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className="text-lg font-semibold text-slate-950">Notifications</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Get an email when a reassessment is due or when an active practice plan needs a check-in.</p>
        <form action={updateReminderPreference} className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
          <div>
            <label htmlFor="reminderEmailsEnabled" className="font-medium text-slate-950">Reminder emails</label>
            <p className="mt-1 text-sm text-slate-600">Reassessment and practice check-in nudges. You can unsubscribe from any email too.</p>
          </div>
          <input type="checkbox" id="reminderEmailsEnabled" name="reminderEmailsEnabled" defaultChecked={reminderEmailsEnabled} className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-800 focus:ring-blue-800" />
          <button type="submit" className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-blue-300 hover:bg-blue-50">Save</button>
        </form>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="help-heading"><h2 id="help-heading" className="text-lg font-semibold text-slate-950">Help improve Athlentra</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{helpLinks.map(({ href, title, copy, icon: Icon, featured }) => <Link key={href} href={href} className={`rounded-2xl border p-4 transition ${featured ? "border-violet-200 bg-violet-50 hover:border-violet-400" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"}`}><Icon className={`h-5 w-5 ${featured ? "text-violet-800" : "text-blue-800"}`} /><span className="mt-3 block font-semibold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-6 text-slate-600">{copy}</span></Link>)}</div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Sign-in and account</h2><div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><div><p className="font-medium text-slate-950">Sign out</p><p className="mt-1 text-sm text-slate-600">Recommended on shared devices.</p></div><SignOutButton /></div><div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4"><h3 className="font-medium text-rose-950">Delete account</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-rose-800">Permanently removes your login, videos, reports, practice history, and profile after confirmation.</p><div className="mt-4"><DeleteAccountButton /></div></div></section>
    </div>
  </AthleteWorkspaceShell>;
}
