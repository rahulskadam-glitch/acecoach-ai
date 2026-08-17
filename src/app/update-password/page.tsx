import Link from "next/link";
import { redirect } from "next/navigation";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import JourneyShell from "@/features/journey/presentation/JourneyShell";
import { createClient } from "@/lib/supabase/server";

type UpdatePasswordPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const params = await searchParams;
  const code = firstParam(params.code);
  const tokenHash = firstParam(params.token_hash);
  const type = firstParam(params.type);
  if (code) {
    const callbackParams = new URLSearchParams({ code, next: "/update-password" });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }
  if (tokenHash && type) {
    const callbackParams = new URLSearchParams({ token_hash: tokenHash, type, next: "/update-password" });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <JourneyShell current="auth" showProgress={false}>
      <div className="mx-auto flex justify-center py-8">
        <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
          {user ? <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">Account recovery</p><h1 className="mt-3 text-2xl font-semibold text-slate-950">Choose a new password</h1><p className="mt-2 text-sm leading-relaxed text-slate-600">Use a strong password that you do not use elsewhere.</p><div className="mt-7"><UpdatePasswordForm /></div></> : <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Reset link required</p><h1 className="mt-3 text-2xl font-semibold text-slate-950">Open a valid recovery link</h1><p className="mt-2 text-sm leading-relaxed text-slate-600">This recovery session is missing or expired. Request a new reset email and open the link it contains.</p><Link href="/forgot-password" className="mt-7 flex h-11 w-full items-center justify-center rounded-2xl bg-[#1b4332] px-4 text-sm font-semibold text-white hover:bg-[#2d6a4f]">Request a new reset link</Link></>}
        </div>
      </div>
    </JourneyShell>
  );
}
