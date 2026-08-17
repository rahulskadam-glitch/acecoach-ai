"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { requestPasswordReset } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

type Stage = "idle" | "sent";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ForgotPasswordForm() {
  const [stage, setStage] = useState<Stage>("idle");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown(seconds = 60) {
    // Clear any existing timer before starting a new one
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function sendReset(email: string) {
    const fd = new FormData();
    fd.append("email", email);
    const result = await requestPasswordReset(fd);
    return result;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email")?.toString().trim() ?? "";
    setLoading(true);
    setError(null);
    const result = await sendReset(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Unable to send reset instructions.");
      return;
    }
    setSubmittedEmail(email);
    setStage("sent");
    startCooldown(60);
  }

  async function handleResend() {
    setResendLoading(true);
    setError(null);
    const result = await sendReset(submittedEmail);
    setResendLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Unable to resend.");
      return;
    }
    startCooldown(60);
  }


  return (
    <AnimatePresence mode="wait">
      {stage === "idle" ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="group flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 transition-all duration-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                <Mail className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-700" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5">
                    <span className="text-rose-400" aria-hidden="true">!</span>
                    <p role="alert" className="text-sm text-rose-800">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-2xl bg-[#123049] font-semibold text-white hover:bg-[#1a4060] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Spinner /> Sending link...</span>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          key="sent"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="flex justify-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </motion.div>

          {/* Copy */}
          <div className="text-center">
            <p className="font-semibold text-slate-950">Check your inbox</p>
            <p className="mt-1.5 text-sm text-slate-600">
              We prepared a reset request for{" "}
              <span className="font-medium text-slate-900">{submittedEmail}</span>
            </p>
            <p className="mt-3 text-xs text-slate-500">
              In this local setup, the email delivery backend isn&apos;t configured, so no message will be sent until Supabase email delivery is enabled.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5">
                  <span className="text-rose-400" aria-hidden="true">!</span>
                  <p role="alert" className="text-sm text-rose-300">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resend */}
          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="h-10 w-full rounded-2xl border-slate-300 bg-white text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {resendLoading ? (
              <span className="flex items-center gap-2"><Spinner /> Resending...</span>
            ) : cooldown > 0 ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Resend in {cooldown}s
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Resend email
              </span>
            )}
          </Button>

          {/* Change email */}
          <button
            type="button"
            onClick={() => { setStage("idle"); setError(null); }}
            className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Use a different email address
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
