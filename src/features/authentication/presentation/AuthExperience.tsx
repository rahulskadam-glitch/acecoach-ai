"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

import { attachJourneyToUser } from "@/app/actions/journey-actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ProviderOption = { id: "google" | "apple" | "azure" | "facebook"; label: string; monogram: string };

function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AppleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.73-14.24-5.87-9.14-10.49-19.46-13.85-30.98-3.37-11.51-5.06-22.56-5.06-33.15 0-14.36 3.63-26.23 10.89-35.61 7.26-9.38 16.48-14.2 27.67-14.47 4.58 0 9.84 1.25 15.78 3.75 5.94 2.5 9.87 3.8 11.79 3.9 1.48-.22 5.66-1.63 12.54-4.22 6.88-2.6 12.63-3.69 17.25-3.29 12.82.76 22.93 5.37 30.34 13.83-11.08 6.74-16.51 15.86-16.31 27.37.21 9.35 3.84 17.18 10.89 23.49 7.05 6.31 15.35 9.84 24.9 10.59-2.06 6.31-4.73 12.73-8.02 19.26zM119.22 33.09c0-6.73 2.45-13.06 7.35-18.99 4.9-5.93 11-9.74 18.3-11.43.65 3.26.54 6.64-.33 10.14-.87 3.5-2.61 6.84-5.22 10.02-2.72 3.26-5.87 5.76-9.45 7.5-3.58 1.74-6.84 2.76-9.78 3.06-.22-.11-.44-.22-.65-.3-.11-.03-.22-.03-.22 0z" />
    </svg>
  );
}

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

  const finishAuthentication = useCallback(async () => {
    await attachJourneyToUser().catch(() => null);
    router.replace(`${next}${next.includes("?") ? "&" : "?"}sport=${encodeURIComponent(sportId)}`);
    router.refresh();
  }, [next, sportId, router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = App.addListener("appUrlOpen", async (event) => {
      try {
        await Browser.close().catch(() => null);
        if (event.url && event.url.includes("auth/callback")) {
          const urlStr = event.url.replace("athlentratennis://", "http://localhost/");
          const parsed = new URL(urlStr);
          const code = parsed.searchParams.get("code");
          if (code) {
            setLoading("oauth");
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeError) {
              await finishAuthentication();
              return;
            }
            setError(exchangeError.message);
            setLoading(null);
          }
        }
      } catch (err) {
        console.error("Deep link error:", err);
      }
    });

    return () => {
      void sub.then((handle) => handle.remove()).catch(() => null);
    };
  }, [supabase, finishAuthentication]);

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
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#2fa87f_0%,#5aa3d8_52%,#d7e022_100%)]" />
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2fa87f]">Athlentra {sportName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{mode === "signin" ? "Continue to your videos, reports, and practice plan." : "Create one account to analyze your tennis strokes."}</p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-xl bg-[#eaf0ec] p-1" role="tablist" aria-label="Authentication mode"><button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(null); }} className={`min-h-11 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-white text-[#123049] shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Sign in</button><button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(null); }} className={`min-h-11 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-white text-[#123049] shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Create account</button></div>

        {message === "check_email" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Check your email to confirm your account. Your selected sport and next step are preserved.</div> : null}
        {message === "auth_callback_failed" ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">That sign-in link could not be verified. Please try again.</div> : null}
        {message === "password_updated" ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Your password was updated. Sign in with the new password.</div> : null}

        {providers.length > 0 ? (
          <div className="mt-7 space-y-3">
            {providers.map((provider) => {
              if (provider.id === "apple") {
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => signInWithProvider(provider)}
                    disabled={loading !== null}
                    className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-black px-4 text-sm font-semibold text-white shadow-md transition hover:bg-neutral-900 active:scale-[0.99] disabled:opacity-60"
                  >
                    <AppleLogo className="h-5 w-5 fill-current" />
                    <span>{loading === provider.id ? "Connecting to Apple…" : "Sign in with Apple"}</span>
                  </button>
                );
              }
              if (provider.id === "google") {
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => signInWithProvider(provider)}
                    disabled={loading !== null}
                    className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                  >
                    <GoogleLogo className="h-5 w-5" />
                    <span>{loading === provider.id ? "Connecting to Google…" : "Sign in with Google"}</span>
                  </button>
                );
              }
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => signInWithProvider(provider)}
                  disabled={loading !== null}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
                    {provider.monogram}
                  </span>
                  <span>{loading === provider.id ? "Connecting…" : `Continue with ${provider.label}`}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {providers.length > 0 ? <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div> : null}

        <form onSubmit={submitEmail} className="space-y-4">
          {mode === "signup" ? <label className="block text-sm font-medium text-slate-700">Full name<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#2fa87f] focus-within:ring-2 focus-within:ring-[#5aa3d8]/30"><input value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full bg-transparent outline-none" autoComplete="name" required placeholder="Your name" /></div></label> : null}
          <label className="block text-sm font-medium text-slate-700">Email<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#2fa87f] focus-within:ring-2 focus-within:ring-[#5aa3d8]/30"><Mail className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="min-h-12 w-full bg-transparent outline-none" autoComplete="email" required placeholder="you@example.com" /></div></label>
          <label className="block text-sm font-medium text-slate-700">Password<div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5df] bg-white px-4 focus-within:border-[#2fa87f] focus-within:ring-2 focus-within:ring-[#5aa3d8]/30"><LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} minLength={8} maxLength={128} className="min-h-12 w-full bg-transparent outline-none" autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-lg p-2 text-slate-400 hover:text-slate-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          <button type="submit" disabled={loading !== null} className="ath-primary flex min-h-13 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold disabled:opacity-60">{loading === "email" ? (mode === "signin" ? "Signing in…" : "Creating account…") : mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </form>

        {mode === "signin" ? <Link href="/forgot-password" className="mt-5 block text-center text-sm font-medium text-[#2fa87f] hover:text-[#123049]">Forgot password?</Link> : null}
        <p className="mt-7 text-center text-xs leading-5 text-slate-500">By continuing, you agree to the <Link href="/terms" className="underline hover:text-slate-800">Terms</Link> and acknowledge the <Link href="/privacy" className="underline hover:text-slate-800">Privacy Policy</Link>.</p>
      </section>
    </div>
  );
}
