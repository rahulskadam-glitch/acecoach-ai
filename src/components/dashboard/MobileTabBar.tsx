"use client";

import { BarChart3, BookOpenCheck, LayoutGrid, Library, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const playerLinks = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/start", label: "Analyze", icon: Plus },
  { href: "/library", label: "Videos", icon: Library },
  { href: "/practice", label: "Practice", icon: BookOpenCheck },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="ath-glass fixed inset-x-3 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-5 rounded-[1.35rem] p-1.5 lg:hidden">
      {playerLinks.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const analyze = item.href === "/start";
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.66rem] font-semibold transition active:scale-95 ${analyze ? "text-[#1b4332]" : active ? "bg-[#e6ede0] text-[#40916c]" : "text-slate-500 active:bg-slate-50"}`}>{analyze ? <span className={`absolute -top-5 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-[#e6ede0] shadow-lg ${active ? "bg-[#d7e022] text-[#1b4332]" : "bg-[#1b4332] text-white"}`}><Icon className="h-5 w-5" /></span> : <Icon className="h-4 w-4" />}<span className={analyze ? "mt-7" : ""}>{item.label}</span></Link>;
      })}
    </nav>
  );
}
