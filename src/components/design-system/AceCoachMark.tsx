import { Activity } from "lucide-react";
import Link from "next/link";

export default function AceCoachMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173F6A] text-white shadow-sm">
        <Activity className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">AceCoach</span>
        <span className="block text-base font-semibold text-slate-950">Movement intelligence</span>
      </span>
    </Link>
  );
}
