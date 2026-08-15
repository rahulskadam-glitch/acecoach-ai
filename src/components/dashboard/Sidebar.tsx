"use client";

import { BarChart3, BookOpenCheck, LayoutGrid, Library, LifeBuoy, MessageSquareHeart, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import AthlentraMark from "@/components/design-system/AthlentraMark";

const playerLinks = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/start", label: "Analyze", icon: Plus },
  { href: "/library", label: "Videos", icon: Library },
  { href: "/practice", label: "Practice", icon: BookOpenCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

const utilityLinks = [
  { href: "/settings", label: "Account", icon: UserRound },
  { href: "/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/support", label: "Help", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();

  return <>
    <header className="sticky top-0 z-40 -mx-3 -mt-3 flex min-h-16 items-center justify-between border-b border-[#dce5df] bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <AthlentraMark href="/home" />
      <Link href="/settings" aria-label="Account" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dce5df] bg-white text-[#071b2d] shadow-sm transition active:scale-95"><UserRound className="h-5 w-5" /></Link>
    </header>
    <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#071b2d] p-5 text-white shadow-2xl shadow-slate-950/15 lg:flex">
      <AthlentraMark href="/home" inverse />
      <nav className="mt-8 space-y-1.5" aria-label="Player navigation">
          {playerLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[#d8ff52] text-[#071b2d] shadow-lg shadow-lime-950/10" : "text-slate-300 hover:bg-white/[0.08] hover:text-white"}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-[#071b2d]/[0.08]" : "bg-white/[0.05]"}`}><Icon className="h-4 w-4" /></span>{item.label}</Link>;
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
    <nav aria-label="Primary navigation" className="ath-glass fixed inset-x-3 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-5 rounded-[1.35rem] p-1.5 lg:hidden">
      {playerLinks.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const analyze = item.href === "/start";
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.66rem] font-semibold transition active:scale-95 ${analyze ? "text-[#071b2d]" : active ? "bg-[#e8f2ed] text-[#075f4e]" : "text-slate-500 active:bg-slate-50"}`}>{analyze ? <span className={`absolute -top-5 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#f3f6f2] shadow-lg ${active ? "bg-[#d8ff52] text-[#071b2d]" : "bg-[#071b2d] text-white"}`}><Icon className="h-5 w-5" /></span> : <Icon className="h-4 w-4" />}<span className={analyze ? "mt-7" : ""}>{item.label}</span></Link>;
      })}
    </nav>
  </>;
}
