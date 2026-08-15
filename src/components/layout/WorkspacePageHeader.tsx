import type { ReactNode } from "react";

export default function WorkspacePageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <section className="ath-card overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#08715b]">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#071b2d] lg:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[#425466]">{description}</p></div>
        {action}
      </div>
    </section>
  );
}
