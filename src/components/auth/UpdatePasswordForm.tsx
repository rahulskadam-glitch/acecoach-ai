"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { updatePassword } from "@/app/actions/auth-actions";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    fd.set("confirm", confirm);
    try {
      const result = await updatePassword(fd);
      if (!result.ok) {
        setError(result.message ?? "Unable to update password.");
        return;
      }
      setSuccess(true);
      redirectTimerRef.current = setTimeout(
        () => router.replace(result.next ?? "/login?message=password_updated"),
        1800,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/20"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </motion.div>
        <div>
          <p className="font-semibold text-slate-950">Password updated</p>
          <p className="mt-1 text-sm text-slate-600">Redirecting you to sign in...</p>
        </div>
        <div className="mt-1 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          required
        />
        {password && <PasswordStrength password={password} />}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <AnimatePresence mode="wait">
            {passwordsMatch && (
              <motion.span
                key="match"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
              </motion.span>
            )}
            {passwordsMismatch && (
              <motion.span
                key="mismatch"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-rose-400"
              >
                <XCircle className="h-3.5 w-3.5" /> Does not match
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <PasswordInput
          id="confirm"
          placeholder="Repeat your new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
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
        disabled={loading || passwordsMismatch || password.length < 8}
        className="h-11 w-full rounded-2xl bg-[#1b4332] font-semibold text-white hover:bg-[#2d6a4f] disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2"><Spinner /> Updating password...</span>
        ) : (
          "Set new password"
        )}
      </Button>

      <Link
        href="/auth"
        className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </form>
  );
}
