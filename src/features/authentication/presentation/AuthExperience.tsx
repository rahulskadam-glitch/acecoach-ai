"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

import { attachJourneyToUser } from "@/app/actions/journey-actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ProviderOption = { id: "google" | "apple" | "azure" | "facebook"; label: string; monogram: string };

export default function AuthExperience({ sportName, sportId, next, providers, initialMode = "signin", message }: { sportName: string; sportId: string; next: string; providers: ProviderOption[]; initialMode?: "signin" | "signup"; message?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
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
    const destination = `${next}${next.includes("?") ? "&" : "?"}sport=${sportId}`;
    const native = Capacitor.isNativePlatform();
    const redirectTo = native
      ? `athlentratennis://auth/callback?next=${encodeURIComponent(destination)}`
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider.id,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: provider.id === "azure" ? "email openid profile" : undefined,
        },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error(`${provider.label} sign-in is temporarily unavailable.`);
      if (native) await Browser.open({ url: data.url, presentationStyle: "popover" });
      else window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${provider.label} sign-in could not start.`);
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
    try {
      if (mode === "signup") {
        const parts = name.trim().split(/\s+/);
        const firstName = parts.shift() ?? "";
        const lastName = parts.join(" ");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: Capacitor.isNativePlatform()
              ? `athlentratennis://auth/callback?next=${encodeURIComponent(`${next}${next.includes("?") ? "&" : "?"}sport=${sportId}`)}`
              : `${window.location.origin}/auth/callback?next=${encodeURIComponent(`${next}${next.includes("?") ? "&" : "?"}sport=${sportId}`)}`,
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
        setError(signInError.message === "Invalid login credentials" ? "We could not match that email and password." : signInError.message);
        setLoading(null);
        return;
      }
      await finishAuthentication();
    } catch (cause) {
      const networkFailure = cause instanceof TypeError || (cause instanceof Error && /fetch|network/i.test(cause.message));
      setError(networkFailure ? "Could not reach the sign-in service. Check your connection and try again." : cause instanceof Error ? cause.message : "Sign-in could not be completed.");
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-md py-2 sm:py-8">
      <section className="ath-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#08715b_0%,#79d5ff_52%,#d8ff52_100%)]" />
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#08715b]">Athlentra {sportName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{mode === "signin" ? "Continue to your videos, reports, and practice plan." : "Create one account to analyze your tennis strokes."}</p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-xl bg-[#eaf0ec] p-1" role="tablist" aria-label="Authentication mode"><button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(null); }} className={`min-h-11 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-white text-[#071b2d] shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Sign in</button><button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(null); }} className={`min-h-11 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-white text-[#071b2d] shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Create account</button></div>

        {message === "check_email" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Check your email to confirm your account. Your selected sport and next step are preserved.</div> : null}
        {message === "auth_callback_failed" ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">That sign-in link could not be verified. Please try again.</div> : null}
        {message === "password_updated" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Your password was updated. Sign in with the new password.</div> : null}

        {providers.length > 0 ? <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => <button key={provider.id} type="button" onClick={() => signInWithProvider(provider)} disabled={loading !== null} className="flex min-h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">{provider.monogram}</span>{loading === provider.id ? "Connecting…" : `Continue with ${provider.label}`}</button>)}
        </div> : null}

        {providers.length > 0 ? <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div> : null}

        <form onSubmit={submitEmail} className="space-y-4">
          {mode === "signup" ? <label className="block text-sm font-medium text-slate-700">Full name<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#08715b] focus-within:ring-2 focus-within:ring-[#79d5ff]/30"><input value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full bg-transparent outline-none" autoComplete="name" required placeholder="Your name" /></div></label> : null}
          <label className="block text-sm font-medium text-slate-700">Email<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#08715b] focus-within:ring-2 focus-within:ring-[#79d5ff]/30"><Mail className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="min-h-12 w-full bg-transparent outline-none" autoComplete="email" required placeholder="you@example.com" /></div></label>
          <label className="block text-sm font-medium text-slate-700">Password<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#08715b] focus-within:ring-2 focus-within:ring-[#79d5ff]/30"><LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} maxLength={128} className="min-h-12 w-full bg-transparent outline-none" autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-2 text-slate-400 hover:text-slate-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          <button type="submit" disabled={loading !== null} className="ath-primary flex min-h-13 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold disabled:opacity-60">{loading === "email" ? (mode === "signin" ? "Signing in…" : "Creating account…") : mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </form>

        {mode === "signin" ? <Link href="/forgot-password" className="mt-5 block text-center text-sm font-medium text-[#08715b] hover:text-[#071b2d]">Forgot password?</Link> : null}
        <p className="mt-7 text-center text-xs leading-5 text-slate-500">By continuing, you agree to the <Link href="/terms" className="underline hover:text-slate-800">Terms</Link> and acknowledge the <Link href="/privacy" className="underline hover:text-slate-800">Privacy Policy</Link>.</p>
      </section>
    </div>
  );
}
