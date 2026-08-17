import { CircleDotDashed } from "lucide-react";
import Link from "next/link";

export default function AthlentraMark({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${inverse ? "bg-[#d7e022] text-[#123049]" : "bg-[#123049] text-white"}`}>
        <CircleDotDashed className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className={`block text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${inverse ? "text-slate-400" : "text-slate-500"}`}>Athlentra</span>
        <span className={`block text-base font-semibold ${inverse ? "text-white" : "text-slate-950"}`}>Tennis AI Coach</span>
      </span>
    </Link>
  );
}
