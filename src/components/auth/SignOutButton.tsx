"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOutUser } from "@/app/actions/auth-actions";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const result = await signOutUser();
    router.replace(result.next ?? "/auth");
    router.refresh();
  }

  return <button type="button" onClick={signOut} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"><LogOut className="h-4 w-4" />{busy ? "Signing out…" : "Sign out"}</button>;
}
