"use client";

import { BarChart3, BookOpenCheck, FlaskConical, Gauge, LayoutGrid, Library, LifeBuoy, LogOut, MessageSquareHeart, ReceiptText, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { signOutUser } from "@/app/actions/auth-actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/upload", label: "Record / Upload", icon: Upload },
  { href: "/library", label: "Analyze / Library", icon: Library },
  { href: "/practice", label: "Practice", icon: BookOpenCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/benchmark", label: "Product benchmark", icon: Gauge },
  { href: "/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/methodology", label: "Methodology", icon: FlaskConical },
  { href: "/pricing", label: "Plans", icon: ReceiptText },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOutUser();
    router.replace(result.next ?? "/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-full flex-col justify-between rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/20">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><LayoutGrid className="h-5 w-5" /></div>
          <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">AceCoach</p><p className="text-lg font-semibold text-white">Studio</p></div>
        </div>
        <nav className="mt-8 space-y-2">
          {links.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${active ? "bg-emerald-500/15 text-emerald-300" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</Link>;
          })}
        </nav>
      </div>
      <button type="button" onClick={handleSignOut} disabled={signingOut} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"><LogOut className="h-4 w-4" />{signingOut ? "Signing out..." : "Sign out"}</button>
    </aside>
  );
}
