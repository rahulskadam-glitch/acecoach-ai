import type { ReactNode } from "react";

export default function WorkspacePageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-white lg:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{description}</p></div>
        {action}
      </div>
    </section>
  );
}
