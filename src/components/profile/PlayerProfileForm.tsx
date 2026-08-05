"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Save, ShieldCheck, Sparkles, RotateCcw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { resetCoachingProfile, saveProfile } from "@/app/actions/video-actions";
import { Button } from "@/components/ui/button";
import { getSport, supportedSports } from "@/lib/sports";

type InitialProfile = {
  firstName: string;
  lastName: string;
  age: number | null;
  country: string;
  countryCode: string;
  primarySportId: string;
  playingLevel: string;
  dominantSide: string;
  gender: string;
  primaryGoal: string;
  yearsPlaying: number | null;
  trainingSessions: number | null;
  competitionLevel: string;
  heightCm: number | null;
  weightKg: number | null;
  mobilityConsiderations: string;
  serviceProcessing: boolean;
  derivedDataImprovement: boolean;
  rawMediaTraining: boolean;
};

type ProfileProps = {
  initialProfile: InitialProfile;
};

const levels = ["Beginner", "Intermediate", "Advanced", "Competitive"];
const competitionLevels = ["", "Recreational", "Club", "School/college", "Regional/state", "National", "International"];

export default function PlayerProfileForm({ initialProfile }: ProfileProps) {
  const [form, setForm] = useState({
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    age: initialProfile.age ? String(initialProfile.age) : "",
    country: initialProfile.country,
    countryCode: initialProfile.countryCode,
    primarySportId: initialProfile.primarySportId || "tennis",
    playingLevel: initialProfile.playingLevel || "Beginner",
    dominantSide: initialProfile.dominantSide || "right",
    gender: initialProfile.gender || "neutral",
    primaryGoal: initialProfile.primaryGoal,
    yearsPlaying: initialProfile.yearsPlaying === null ? "" : String(initialProfile.yearsPlaying),
    trainingSessions: initialProfile.trainingSessions === null ? "" : String(initialProfile.trainingSessions),
    competitionLevel: initialProfile.competitionLevel,
    heightCm: initialProfile.heightCm === null ? "" : String(initialProfile.heightCm),
    weightKg: initialProfile.weightKg === null ? "" : String(initialProfile.weightKg),
    mobilityConsiderations: initialProfile.mobilityConsiderations,
    serviceProcessing: initialProfile.serviceProcessing,
    derivedDataImprovement: initialProfile.derivedDataImprovement,
    rawMediaTraining: initialProfile.rawMediaTraining,
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const selectedSport = useMemo(() => getSport(form.primarySportId), [form.primarySportId]);
  const age = Number(form.age || 0);
  const isYouthAthlete = age > 0 && age < 18;

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSavedMessage(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const formData = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (typeof value === "boolean") formData.set(key, value ? "true" : "false");
      else formData.set(key, value);
    }
    try {
      await saveProfile(formData);
      setSavedMessage("Profile and consent choices saved. Analysis is available for all configured athlete ages.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the coaching profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Reset sport, goals, physical details, and analysis consent? Existing videos and reports will remain, but new analysis will be blocked until the profile is completed again.",
    );
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    setSavedMessage(null);
    try {
      await resetCoachingProfile();
      setForm((current) => ({
        ...current,
        age: "",
        primarySportId: "tennis",
        playingLevel: "Beginner",
        dominantSide: "right",
        gender: "neutral",
        primaryGoal: "",
        yearsPlaying: "",
        trainingSessions: "",
        competitionLevel: "",
        heightCm: "",
        weightKg: "",
        mobilityConsiderations: "",
        serviceProcessing: false,
        derivedDataImprovement: false,
        rawMediaTraining: false,
      }));
      setSavedMessage("Optional coaching data and analysis consent were reset. Your account, videos, and reports were not deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset the coaching profile.");
    } finally {
      setResetting(false);
    }
  }

  const inputClass = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Athlete context</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Personalize coaching without over-collecting data</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Required fields shape language, movement selection, and practice difficulty. Optional physical details are never used as medical diagnoses.
          </p>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <Sparkles className="mr-2 inline h-4 w-4" />
          Versioned athlete context
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Required essentials</p>
            <p className="mt-1 text-sm text-slate-500">These fields are included in the analysis fingerprint so stale reports are not silently reused.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              First name
              <input required maxLength={80} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Last name
              <input required maxLength={80} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">
              Age
              <input type="number" min={5} max={100} required value={form.age} onChange={(event) => update("age", event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Country
              <input required maxLength={120} value={form.country} onChange={(event) => update("country", event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Country code <span className="text-slate-600">(optional)</span>
              <input maxLength={8} placeholder="IN" value={form.countryCode} onChange={(event) => update("countryCode", event.target.value.toUpperCase())} className={inputClass} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              Primary sport
              <select
                value={form.primarySportId}
                onChange={(event) => {
                  const sport = getSport(event.target.value);
                  setForm((current) => ({
                    ...current,
                    primarySportId: sport.id,
                    primaryGoal: sport.profileGoals[0] ?? "",
                  }));
                  setSavedMessage(null);
                }}
                className={inputClass}
              >
                {supportedSports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Playing level
              <select value={form.playingLevel} onChange={(event) => update("playingLevel", event.target.value)} className={inputClass}>
                {levels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">
              Dominant side
              <select value={form.dominantSide} onChange={(event) => update("dominantSide", event.target.value)} className={inputClass}>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Silhouette style <span className="text-slate-600">(optional)</span>
              <select value={form.gender} onChange={(event) => update("gender", event.target.value)} className={inputClass}>
                <option value="neutral">Neutral</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <span className="block text-xs leading-5 text-slate-500">Used only to choose the reference-body visual. AceCoach does not infer gender from video.</span>
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              Primary coaching goal
              <select value={form.primaryGoal} required onChange={(event) => update("primaryGoal", event.target.value)} className={inputClass}>
                <option value="">Choose a goal</option>
                {selectedSport.profileGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/45 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Optional performance context</p>
            <p className="mt-1 text-sm text-slate-500">Useful for practice dosage and language; not required to receive a report.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">Years playing<input type="number" min={0} max={90} value={form.yearsPlaying} onChange={(event) => update("yearsPlaying", event.target.value)} className={inputClass} /></label>
            <label className="space-y-2 text-sm text-slate-300">Training sessions/week<input type="number" min={0} max={21} value={form.trainingSessions} onChange={(event) => update("trainingSessions", event.target.value)} className={inputClass} /></label>
            <label className="space-y-2 text-sm text-slate-300">Competition level<select value={form.competitionLevel} onChange={(event) => update("competitionLevel", event.target.value)} className={inputClass}>{competitionLevels.map((value) => <option key={value || "none"} value={value}>{value || "Not specified"}</option>)}</select></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">Height (cm)<input type="number" min={80} max={250} step="0.1" value={form.heightCm} onChange={(event) => update("heightCm", event.target.value)} className={inputClass} /></label>
            <label className="space-y-2 text-sm text-slate-300">Weight (kg)<input type="number" min={20} max={300} step="0.1" value={form.weightKg} onChange={(event) => update("weightKg", event.target.value)} className={inputClass} /></label>
          </div>
          <label className="block space-y-2 text-sm text-slate-300">
            Mobility considerations <span className="text-slate-600">(optional; do not enter a diagnosis)</span>
            <textarea maxLength={800} rows={3} value={form.mobilityConsiderations} onChange={(event) => update("mobilityConsiderations", event.target.value)} className={inputClass} placeholder="Example: prefers lower-impact drills or limited overhead range." />
          </label>
        </section>

        <section className="space-y-4 rounded-3xl border border-violet-500/20 bg-violet-500/[0.05] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-violet-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Consent and data use</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">Required processing powers the report. Optional choices can be changed later and are not required for service access.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <input type="checkbox" checked={form.serviceProcessing} onChange={(event) => update("serviceProcessing", event.target.checked)} className="mt-1 h-4 w-4" />
            <span><strong className="text-white">Required for analysis:</strong> Process my uploaded video and derived movement data to provide AceCoach analysis. You can withdraw this consent by resetting coaching data.</span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <input type="checkbox" checked={form.derivedDataImprovement} onChange={(event) => update("derivedDataImprovement", event.target.checked)} className="mt-1 h-4 w-4" />
            <span><strong className="text-white">Optional:</strong> Use de-identified derived metrics and feedback to improve evaluation quality.</span>
          </label>
          {isYouthAthlete ? (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 text-sm leading-6 text-sky-100/80">
              Youth analysis is enabled. For public launch, the account owner should implement the guardian and local youth-data consent workflow required in each market.
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            <input type="checkbox" checked={form.rawMediaTraining} onChange={(event) => update("rawMediaTraining", event.target.checked)} className="mt-1 h-4 w-4" />
            <span><strong className="text-white">Optional:</strong> Allow raw uploaded media to be considered for governed model improvement. Not required for analysis.</span>
          </label>
        </section>

        {error ? <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
        {savedMessage ? <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{savedMessage}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
          <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Video analysis is educational, not medical or injury-diagnostic advice.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => void handleReset()} disabled={saving || resetting} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15">
              <RotateCcw className="mr-2 h-4 w-4" />
              {resetting ? "Resetting..." : "Reset coaching data"}
            </Button>
            <Button type="submit" disabled={saving || resetting} className="rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
