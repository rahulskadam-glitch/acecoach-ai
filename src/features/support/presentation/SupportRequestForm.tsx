"use client";

import { CheckCircle2, LifeBuoy, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { createSupportRequest } from "@/app/actions/support-actions";

export default function SupportRequestForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    setError(null);
    formData.set("browser", typeof navigator === "undefined" ? "server" : `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`);
    startTransition(() => void createSupportRequest(formData).then(() => setMessage("Support request received. Your diagnostic references were saved without video content or secrets.")).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to submit the request.")));
  }

  const input = "w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/60";
  return <form action={submit} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6"><div className="flex items-center gap-3"><LifeBuoy className="h-5 w-5 text-emerald-300" /><h2 className="text-xl font-semibold text-white">Report an issue</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300">Issue category<select name="category" required className={`${input} mt-2`} defaultValue="processing"><option value="upload">Upload</option><option value="processing">Processing</option><option value="movement">Movement detection</option><option value="report">Report or video playback</option><option value="practice">Practice or progress</option><option value="billing">Pricing or billing</option><option value="account">Account</option><option value="other">Other</option></select></label><label className="text-sm text-slate-300">Last processing stage<input name="lastStage" className={`${input} mt-2`} placeholder="Example: classifying movement" /></label><label className="text-sm text-slate-300">Session reference<input name="sessionId" className={`${input} mt-2`} placeholder="Optional" /></label><label className="text-sm text-slate-300">Job reference<input name="jobId" className={`${input} mt-2`} placeholder="Optional" /></label></div><label className="mt-4 block text-sm text-slate-300">What happened?<textarea name="description" required minLength={10} maxLength={2000} className={`${input} mt-2 min-h-36`} placeholder="Describe what you expected, what happened, and whether retrying changed the result." /></label>{message ? <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</div> : null}{error ? <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}<button type="submit" disabled={pending} className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}{pending ? "Sending…" : "Send support request"}</button><p className="mt-4 text-xs leading-5 text-slate-500">AceCoach stores the app version, browser summary, optional references, and your description. It does not attach raw video, signed URLs, pose frames, or service keys.</p></form>;
}
