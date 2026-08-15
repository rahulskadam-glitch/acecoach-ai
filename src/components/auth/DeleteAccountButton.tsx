"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCurrentAccount } from "@/app/actions/auth-actions";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeAccount() {
    if (confirmation !== "DELETE") return;
    setBusy(true);
    setError(null);
    const result = await deleteCurrentAccount();
    if (!result.ok) {
      setError(result.message ?? "The account could not be deleted.");
      setBusy(false);
      return;
    }
    router.replace(result.next ?? "/");
    router.refresh();
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"><Trash2 className="h-4 w-4" />Delete account</button>;

  return <div className="w-full rounded-2xl border border-rose-300 bg-rose-50 p-4 text-slate-950"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-semibold text-rose-900"><AlertTriangle className="h-5 w-5" />Permanently delete this account?</div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">This removes your login, videos, reports, practice history, coaching conversations, and profile. This cannot be undone.</p></div><button type="button" onClick={() => { setOpen(false); setConfirmation(""); setError(null); }} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Cancel account deletion"><X className="h-4 w-4" /></button></div><label className="mt-4 block text-sm font-medium text-slate-800">Type <strong>DELETE</strong> to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoCapitalize="characters" autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-rose-200 bg-white px-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" /></label>{error ? <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p> : null}<button type="button" onClick={removeAccount} disabled={confirmation !== "DELETE" || busy} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-rose-300"><Trash2 className="h-4 w-4" />{busy ? "Deleting account…" : "Delete permanently"}</button></div>;
}
