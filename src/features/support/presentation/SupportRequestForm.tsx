"use client";

import { CheckCircle2, LifeBuoy, LoaderCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { createSupportRequest } from "@/app/actions/support-actions";

export default function SupportRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    setError(null);
    if (typeof navigator !== "undefined") formData.set("browser", `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight} | ${window.location.pathname}`);
    startTransition(() => void createSupportRequest(formData).then(() => { formRef.current?.reset(); setMessage("Thanks — your message has been sent."); }).catch((cause) => setError(cause instanceof Error ? cause.message : "We could not send your message. Please try again.")));
  }

  const fieldClass = "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  return (
    <form ref={formRef} action={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-50 p-2.5"><LifeBuoy className="h-5 w-5 text-blue-700" /></span><div><h2 className="text-xl font-semibold text-slate-950">Send us a message</h2><p className="mt-1 text-sm leading-6 text-slate-600">Choose the closest topic and describe what you expected to happen.</p></div></div>
      <div className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-slate-700">What do you need help with?<select name="category" required className={fieldClass} defaultValue=""><option value="" disabled>Choose a topic</option><option value="upload">Uploading a video</option><option value="processing">Analysis taking too long</option><option value="movement">Movement identified incorrectly</option><option value="report">Report or video playback</option><option value="practice">Practice or progress</option><option value="billing">Plans or payments</option><option value="account">Account or privacy</option><option value="other">Something else</option></select></label>
        <label className="block text-sm font-medium text-slate-700">What happened?<textarea name="description" required minLength={10} maxLength={2000} rows={6} className={fieldClass} placeholder="For example: I uploaded a forehand video, but the analysis has not finished." /><span className="mt-2 block text-xs leading-5 text-slate-500">Do not include passwords, payment details, or private medical information.</span></label>
      </div>
      {message ? <div role="status" className="mt-5 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</div> : null}
      {error ? <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-xs leading-5 text-slate-500">Basic page and device details are included automatically to help us investigate. Your video is not attached.</p><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#1b4332] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d6a4f] disabled:cursor-not-allowed disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}{pending ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
