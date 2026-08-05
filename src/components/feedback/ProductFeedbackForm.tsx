"use client";

import { useState } from "react";
import { MessageSquareHeart, Send } from "lucide-react";

export default function ProductFeedbackForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    setSaving(true); setSaved(false);
    try { await action(formData); setSaved(true); } finally { setSaving(false); }
  }
  return <form action={submit} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
    <div className="flex items-center gap-3 text-emerald-300"><MessageSquareHeart className="h-5 w-5" /><div><p className="text-sm font-semibold uppercase tracking-[0.2em]">Product feedback</p><h2 className="mt-1 text-2xl font-semibold text-white">Tell us what would make AceCoach more useful</h2></div></div>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Feedback is categorized for human review. It never automatically rewrites scoring rules or changes the live biomechanics engine.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm text-slate-300">Journey stage<select name="stage" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3"><option value="capture">Capture and upload</option><option value="processing">Processing</option><option value="report">Report</option><option value="practice">Practice plan</option><option value="progress">Progress tracking</option><option value="coach">Coach sharing</option><option value="pricing">Pricing and value</option></select></label><label className="space-y-2 text-sm text-slate-300">Feedback category<select name="category" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3"><option value="reliability">Reliability</option><option value="ease_of_use">Ease of use</option><option value="insight_clarity">Insight clarity</option><option value="visuals">Visuals</option><option value="drills">Drills and next steps</option><option value="speed">Speed</option><option value="missing_feature">Missing feature</option><option value="value">Value</option><option value="other">Other</option></select></label></div>
    <label className="mt-4 block space-y-2 text-sm text-slate-300">How useful is AceCoach today?<select name="rating" required className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3"><option value="">Choose</option>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
    <label className="mt-4 block space-y-2 text-sm text-slate-300">What happened, or what should change?<textarea name="comment" required maxLength={2000} rows={6} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3" placeholder="Describe the problem, expected behavior, or improvement idea." /></label>
    <div className="mt-5 flex items-center gap-3"><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"><Send className="h-4 w-4" />{saving ? "Saving..." : "Send feedback"}</button>{saved ? <span className="text-sm text-emerald-300">Feedback saved for review.</span> : null}</div>
  </form>;
}
