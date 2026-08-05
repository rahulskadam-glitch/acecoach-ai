"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(raw: string | null) {
  if (!raw) return "/start";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/start";
  return raw;
}

export async function loginUser(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const next = getSafeNext(formData.get("next")?.toString() ?? null);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(next);
}

export async function registerUser(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const fullName = (formData.get("name")?.toString() ?? "").trim().slice(0, 160);

  if (!fullName || !email || password.length < 8 || password.length > 128) {
    throw new Error("Enter a name, valid email, and a password between 8 and 128 characters.");
  }

  const [firstName, lastName] = fullName.trim().split(/\s+/).reduce<[string, string]>(
    (parts, part) => {
      if (!parts[0]) return [part, ""];
      if (!parts[1]) return [parts[0], part];
      return [parts[0], `${parts[1]} ${part}`];
    },
    ["", ""]
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || fullName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Supabase did not create a user.");
  }

  redirect("/signup/success");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString() ?? "";

  if (!email) {
    return { ok: false, message: "Please provide an email address." };
  }

  const auth = supabase.auth as typeof supabase.auth & {
    resetPasswordForEmail?: (email: string, options?: { redirectTo?: string }) => Promise<{ error: { message: string } | null }>;
  };

  if (typeof auth.resetPasswordForEmail !== "function") {
    return {
      ok: true,
      message: "Password reset is not configured for this environment yet. In a live Supabase setup, a reset email would be delivered to this address.",
    };
  }

  const { error } = await auth.resetPasswordForEmail(email, {
    redirectTo: `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "If an account exists for this email, instructions have been sent.",
  };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirm")?.toString() ?? "";

  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return {
      ok: false,
      message: "This password-reset link is invalid or has expired. Request a new reset email and open its link before choosing a password.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, next: "/login?message=password_updated" };
}

export async function signOutUser() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, message: error.message, next: "/home" };
  }

  return { ok: true, next: "/auth" };
}
