import Link from "next/link";
import { redirect } from "next/navigation";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { createClient } from "@/lib/supabase/server";

type UpdatePasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const params = await searchParams;
  const code = firstParam(params.code);
  const tokenHash = firstParam(params.token_hash);
  const type = firstParam(params.type);

  // Older reset emails pointed here directly. Exchange their one-time token in
  // the callback first so the password form receives an authenticated session.
  if (code) {
    const callbackParams = new URLSearchParams({ code, next: "/update-password" });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  if (tokenHash && type) {
    const callbackParams = new URLSearchParams({
      token_hash: tokenHash,
      type,
      next: "/update-password",
    });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#020617_100%)] px-6 py-10 text-white lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">AceCoach AI</Link>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl items-center justify-center py-12">
        <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {user ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Almost there</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Choose a new password</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Pick something strong and unique. You will be signed in automatically after saving.
              </p>
              <div className="mt-7">
                <UpdatePasswordForm />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Reset link required</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Open a valid recovery link</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                This recovery session is missing or has expired. Request a fresh reset email, then open the link it contains.
              </p>
              <Link
                href="/forgot-password"
                className="mt-7 flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Request a new reset link
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
