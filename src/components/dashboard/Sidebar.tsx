"use client";

import { LifeBuoy, MessageSquareHeart, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import AthlentraMark from "@/components/design-system/AthlentraMark";
import MobileTabBar, { playerLinks } from "@/components/dashboard/MobileTabBar";

const utilityLinks = [
  { href: "/settings", label: "Account", icon: UserRound },
  { href: "/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/support", label: "Help", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();

  return <>
    <header className="sticky top-0 z-40 -mx-3 -mt-3 flex min-h-16 items-center justify-between border-b border-[#d6e2cf] bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <AthlentraMark href="/home" />
      <div className="flex items-center gap-2">
        <Link href="/feedback" aria-label="Give feedback" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d6e2cf] bg-white text-[#1b4332] shadow-sm transition active:scale-95"><MessageSquareHeart className="h-5 w-5" /></Link>
        <Link href="/settings" aria-label="Account" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d6e2cf] bg-white text-[#1b4332] shadow-sm transition active:scale-95"><UserRound className="h-5 w-5" /></Link>
      </div>
    </header>
    <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1b4332] p-5 text-white shadow-2xl shadow-slate-950/15 lg:flex">
      <AthlentraMark href="/home" inverse />
      <nav className="mt-8 space-y-1.5" aria-label="Player navigation">
          {playerLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[#d7e022] text-[#1b4332] shadow-lg shadow-lime-950/10" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-[#1b4332]/[0.08]" : "bg-white/[0.05]"}`}><Icon className="h-4 w-4" /></span>{item.label}</Link>;
          })}
      </nav>
      <nav className="mt-auto space-y-1 border-t border-white/10 pt-4" aria-label="Account and help">
        {utilityLinks.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-white/[0.12] text-white" : "text-slate-400 hover:bg-white/[0.08] hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</Link>;
        })}
      </nav>
    </aside>
    <MobileTabBar />
  </>;
}
