"use client";

import { useState } from "react";
import { MessageSquareHeart, Send } from "lucide-react";

export default function ProductFeedbackForm({ action, initialStage = "report" }: { action: (formData: FormData) => Promise<void>; initialStage?: string }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    setSaving(true); setSaved(false);
    try { await action(formData); setSaved(true); } finally { setSaving(false); }
  }
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100";
  return <form action={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex items-center gap-3 text-violet-800"><MessageSquareHeart className="h-5 w-5" /><div><p className="text-sm font-semibold uppercase tracking-[0.18em]">Your experience</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Tell us what worked and what should change</h2></div></div>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Choose the part of the journey you are rating so the right product area receives your feedback.</p>
    <label className="mt-6 block space-y-2 text-sm font-medium text-slate-700">Overall rating<select name="rating" required className={inputClass}><option value="">Choose a rating</option>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5 — {value === 5 ? "Excellent" : value === 4 ? "Good" : value === 3 ? "Okay" : value === 2 ? "Needs work" : "Poor"}</option>)}</select></label>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-medium text-slate-700">Journey stage<select name="stage" defaultValue={initialStage} className={inputClass}><option value="capture">Capture and upload</option><option value="processing">Processing</option><option value="report">Report</option><option value="practice">Practice plan</option><option value="progress">Progress tracking</option><option value="coach">Coach sharing</option><option value="pricing">Pricing and value</option></select></label><label className="space-y-2 text-sm font-medium text-slate-700">Feedback category<select name="category" className={inputClass}><option value="reliability">Reliability</option><option value="ease_of_use">Ease of use</option><option value="insight_clarity">Insight clarity</option><option value="visuals">Visuals</option><option value="drills">Drills and next steps</option><option value="speed">Speed</option><option value="missing_feature">Missing feature</option><option value="value">Value</option><option value="other">Other</option></select></label></div>
    <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">What happened, or what should change?<textarea name="comment" required maxLength={2000} rows={6} className={inputClass} placeholder="What was useful? What was confusing? What would improve your next session?" /></label>
    <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={saving} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"><Send className="h-4 w-4" />{saving ? "Saving..." : "Send feedback"}</button>{saved ? <span role="status" className="text-sm font-medium text-emerald-700">Thank you—your feedback was saved.</span> : null}</div>
  </form>;
}
