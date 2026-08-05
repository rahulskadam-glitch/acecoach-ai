"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Sparkles, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loginUser } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  initialError?: string;
  next?: string;
};

export default function LoginForm({ initialError, next }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await loginUser(formData);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("acecoach-remember", String(rememberMe));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = createClient();

    if (!supabase || !isSupabaseConfigured()) {
      setError("Supabase authentication is not configured.");
      return;
    }

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=/dashboard`
      : undefined;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/20"
    >
      <div className="flex items-center gap-2 text-emerald-300">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Welcome back</p>
          <p className="text-lg font-semibold text-white">Log in to AceCoach AI</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <Lock className="h-4 w-4 text-slate-500" />
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-950"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-emerald-300 transition hover:text-emerald-200">
            Forgot password?
          </Link>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <Button type="submit" className="w-full rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
        <div className="h-px flex-1 bg-white/10" />
        <span>Or continue with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <Button type="button" variant="outline" className="w-full rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handleGoogle}>
        <BadgeCheck className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{" "}
        <Link href="/signup" className="font-medium text-emerald-300 transition hover:text-emerald-200">
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}
