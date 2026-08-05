"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { registerUser } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await registerUser(new FormData(event.currentTarget));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create account.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/20"
    >
      <div className="flex items-center gap-2 text-emerald-300">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Create account</p>
          <p className="text-lg font-semibold text-white">Join AceCoach AI</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-400">
        Start with a secure account. Sport, level, goals, and analysis consent are collected separately in the athlete profile so onboarding stays clear and choices remain editable.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-300">Full name</label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <User className="h-4 w-4 text-slate-500" />
            <input id="name" name="name" type="text" maxLength={160} autoComplete="name" placeholder="Alex Morgan" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" required />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <input id="email" name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" required />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <Lock className="h-4 w-4 text-slate-500" />
            <input id="password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" required />
          </div>
        </div>

        {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

        <Button type="submit" className="w-full rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account? <Link href="/login" className="font-medium text-emerald-300 transition hover:text-emerald-200">Sign in</Link>
      </p>
    </motion.div>
  );
}
