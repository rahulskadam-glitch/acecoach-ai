"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { attachJourneyToUser } from "@/app/actions/journey-actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ProviderOption = { id: "google" | "apple" | "azure" | "facebook"; label: string; monogram: string };

export default function AuthExperience({ sportName, sportId, next, providers, message }: { sportName: string; sportId: string; next: string; providers: ProviderOption[]; message?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function finishAuthentication() {
    await attachJourneyToUser().catch(() => null);
    router.replace(`${next}${next.includes("?") ? "&" : "?"}sport=${encodeURIComponent(sportId)}`);
    router.refresh();
  }

  async function signInWithProvider(provider: ProviderOption) {
    setLoading(provider.id);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured in this environment.");
      setLoading(null);
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${next}?sport=${sportId}`)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: provider.id,
      options: { redirectTo, scopes: provider.id === "azure" ? "email openid profile" : undefined },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("email");
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured in this environment.");
      setLoading(null);
      return;
    }
    if (mode === "signup") {
      const parts = name.trim().split(/\s+/);
      const firstName = parts.shift() ?? "";
      const lastName = parts.join(" ");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${next}?sport=${sportId}`)}`,
          data: { first_name: firstName, last_name: lastName, primary_sport_id: sportId },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(null);
        return;
      }
      if (!data.session) {
        router.replace(`/auth?sport=${sportId}&next=${encodeURIComponent(next)}&message=check_email`);
        setLoading(null);
        return;
      }
      await finishAuthentication();
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "The email or password is incorrect." : signInError.message);
      setLoading(null);
      return;
    }
    await finishAuthentication();
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <section className="hidden lg:block">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">{sportName} selected</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950">One account.<br />One clear path forward.</h1>
        <p className="mt-5 max-w-md text-base leading-8 text-slate-600">Sign in once, upload your movement, and continue directly to analysis. Your sport selection is already saved.</p>
        <div className="mt-8 space-y-4 text-sm text-slate-600">
          {["Original video stays under your control", "No dashboard detour before your first report", "Technical detail is available only when you need it"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />{item}</div>)}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
        <div className="text-center">
          <p className="text-sm font-semibold text-blue-800">{sportName} selected</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{mode === "signin" ? "Welcome back" : "Create your AceCoach account"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Continue directly to your video and movement details.</p>
        </div>

        {message === "check_email" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Check your email to confirm your account. Your selected sport and next step are preserved.</div> : null}
        {message === "auth_callback_failed" ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">That sign-in link could not be verified. Please try again.</div> : null}

        {providers.length > 0 ? <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => <button key={provider.id} type="button" onClick={() => signInWithProvider(provider)} disabled={loading !== null} className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">{provider.monogram}</span>{loading === provider.id ? "Connecting…" : `Continue with ${provider.label}`}</button>)}
        </div> : null}

        {providers.length > 0 ? <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div> : null}

        <form onSubmit={submitEmail} className="space-y-4">
          {mode === "signup" ? <label className="block text-sm font-medium text-slate-700">Full name<div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"><input value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full bg-transparent outline-none" autoComplete="name" required placeholder="Your name" /></div></label> : null}
          <label className="block text-sm font-medium text-slate-700">Email<div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"><Mail className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="min-h-12 w-full bg-transparent outline-none" autoComplete="email" required placeholder="you@example.com" /></div></label>
          <label className="block text-sm font-medium text-slate-700">Password<div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"><LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} maxLength={128} className="min-h-12 w-full bg-transparent outline-none" autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-2 text-slate-400 hover:text-slate-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          <button type="submit" disabled={loading !== null} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173F6A] px-5 font-semibold text-white shadow-sm transition hover:bg-[#103554] disabled:opacity-60">{loading === "email" ? "Please wait…" : mode === "signin" ? "Continue with email" : "Create account"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => { setMode((value) => value === "signin" ? "signup" : "signin"); setError(null); }} className="font-semibold text-blue-800 hover:text-blue-950">{mode === "signin" ? "Create an account" : "I already have an account"}</button>
          {mode === "signin" ? <a href="/forgot-password" className="text-slate-600 hover:text-slate-950">Forgot password?</a> : null}
        </div>
        <p className="mt-7 text-center text-xs leading-5 text-slate-500">By continuing, you agree to the Terms and acknowledge the Privacy Policy.</p>
      </section>
    </div>
  );
}
