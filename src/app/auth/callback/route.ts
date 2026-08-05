import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "email", "invite", "magiclink", "email_change", "phone_change"];

function safeNext(raw: string | null): string {
  if (!raw) return "/start";
  // Block protocol-relative URLs like //evil.com
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/start";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = VALID_OTP_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  // PKCE flow (OAuth / magic link via code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));

    // Recovery links are single-use. If another open tab already exchanged the
    // code, continue when that exchange left a valid shared browser session.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL(next, request.url));

    // Fail fast — don't fall through to OTP path
    return NextResponse.redirect(new URL(`/auth?error=auth_callback_failed`, request.url));
  }

  // Email OTP flow (password reset, email confirmation)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    return NextResponse.redirect(new URL(`/auth?error=auth_callback_failed`, request.url));
  }

  return NextResponse.redirect(new URL("/auth?error=auth_callback_failed", request.url));
}
