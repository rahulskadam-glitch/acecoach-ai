import { CheckCircle2, XCircle } from "lucide-react";

import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ token: string }> };

export default async function UnsubscribePage({ params }: PageProps) {
  const { token } = await params;
  const userId = verifyUnsubscribeToken(token);

  let succeeded = false;
  if (userId) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ reminder_emails_enabled: false })
      .eq("id", userId);
    succeeded = !error;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {succeeded ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-950">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You won&apos;t receive reminder emails from Athlentra. You can turn them back on any time in Settings.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-rose-600" />
            <h1 className="mt-4 text-xl font-semibold text-slate-950">Link no longer valid</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This unsubscribe link couldn&apos;t be verified. You can manage reminder emails from your account Settings instead.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
