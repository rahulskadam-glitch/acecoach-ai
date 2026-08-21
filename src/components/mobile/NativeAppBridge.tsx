"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { attachJourneyToUser } from "@/app/actions/journey-actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "recovery", "email", "invite", "magiclink", "email_change", "phone_change"]);

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/start?sport=tennis";
  return value;
}

export default function NativeAppBridge() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => Promise<void>) | undefined;

    async function initialize() {
      const [{ Capacitor }, { App }, { Browser }] = await Promise.all([
        import("@capacitor/core"),
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);
      if (!Capacitor.isNativePlatform() || cancelled) return;

      document.documentElement.dataset.nativeApp = Capacitor.getPlatform();

      // The WKWebView's sessionStorage can survive a full app relaunch (unlike a browser
      // tab), so a "don't show again" dismissal here would otherwise skip the pre-recording
      // checklist forever instead of just for the rest of this app session. Clearing it on
      // every genuine cold launch (this effect only re-runs when the JS context is recreated,
      // not on background/foreground) restores the intended per-session scope.
      try {
        window.sessionStorage.removeItem("athlentra_skip_recording_checklist");
      } catch {
        // ignore
      }

      async function handleUrl(rawUrl: string) {
        if (!rawUrl.startsWith("athlentratennis://") && !rawUrl.startsWith(window.location.origin)) return;
        const url = new URL(rawUrl);
        const isAuthCallback = (url.protocol === "athlentratennis:" && url.host === "auth" && url.pathname === "/callback") || url.pathname === "/auth/callback";
        if (!isAuthCallback || !isSupabaseConfigured()) return;

        const supabase = createClient();
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const rawType = url.searchParams.get("type") as EmailOtpType | null;
        let error: { message: string } | null = null;

        if (code) {
          ({ error } = await supabase.auth.exchangeCodeForSession(code));
        } else if (tokenHash && rawType && OTP_TYPES.has(rawType)) {
          ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: rawType }));
        } else {
          return;
        }

        await Browser.close().catch(() => undefined);
        if (error) {
          router.replace("/auth?error=auth_callback_failed");
          return;
        }

        await attachJourneyToUser().catch(() => null);
        router.replace(safeNext(url.searchParams.get("next")));
        router.refresh();
      }

      const listener = await App.addListener("appUrlOpen", ({ url }) => void handleUrl(url));
      removeListener = () => listener.remove();
      const launch = await App.getLaunchUrl();
      if (launch?.url) await handleUrl(launch.url);
    }

    void initialize();
    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, [router]);

  return null;
}
