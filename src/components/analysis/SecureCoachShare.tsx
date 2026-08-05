"use client";

import { Check, Copy, Link2, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

export default function SecureCoachShare({ onCreate, onRevoke }: { onCreate: () => Promise<{ url: string; expiresAt: string }>; onRevoke: () => Promise<void> }) {
  const [share, setShare] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(() => void onCreate().then(setShare).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to create share link.")));
  }
  function revoke() {
    setError(null);
    startTransition(() => void onRevoke().then(() => setShare(null)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to revoke share link.")));
  }
  async function copy() {
    if (!share) return;
    await navigator.clipboard.writeText(share.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/[0.05] p-6 print:hidden">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-emerald-300" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Coach collaboration</p><h2 className="mt-2 text-xl font-semibold text-white">Share a private coaching summary</h2><p className="mt-2 text-sm leading-6 text-slate-400">The link expires after seven days and excludes the raw video, personal profile, and detailed frame data.</p></div></div>
      {share ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="break-all text-sm text-slate-300">{share.url}</p><p className="mt-2 text-xs text-slate-500">Expires {new Date(share.expiresAt).toLocaleString()}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copy()} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</button><button type="button" onClick={revoke} disabled={pending} className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"><Trash2 className="h-4 w-4" />Revoke</button></div></div>
      ) : <button type="button" onClick={create} disabled={pending} className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"><Link2 className="h-4 w-4" />{pending ? "Creating..." : "Create 7-day coach link"}</button>}
      {error ? <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
