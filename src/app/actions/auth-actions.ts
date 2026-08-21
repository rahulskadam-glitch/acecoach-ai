"use server";

import { isOwnedStoragePath } from "@/lib/storage/ownership";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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
      ok: false,
      message: "Password reset is not available in this environment right now. Please try again later.",
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

  return { ok: true, next: "/auth?message=password_updated" };
}

export async function signOutUser() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, message: error.message, next: "/home" };
  }

  return { ok: true, next: "/auth" };
}

export async function deleteCurrentAccount() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { ok: false, message: "Your session has expired. Sign in again before deleting the account." };

  const admin = createAdminClient();
  const { data: videos, error: videoError } = await admin
    .from("videos")
    .select("storage_path")
    .eq("user_id", user.id);

  if (videoError) return { ok: false, message: "Athlentra could not verify all owned videos. Nothing was deleted." };

  const storagePaths = (videos ?? [])
    .map((video) => video.storage_path)
    .filter((path): path is string => typeof path === "string" && isOwnedStoragePath(path, user.id));

  for (let index = 0; index < storagePaths.length; index += 100) {
    const { error } = await admin.storage.from("videos").remove(storagePaths.slice(index, index + 100));
    if (error) return { ok: false, message: "Athlentra could not remove all owned videos. The account was kept so you can retry or contact support." };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) {
    // Storage objects are already gone at this point — clean up their now-dangling
    // `videos` rows too, so a kept-alive account isn't left pointing at deleted files.
    // Best-effort: a failure here shouldn't hide the primary deletion failure below.
    try {
      await admin.from("videos").delete().eq("user_id", user.id);
    } catch {
      // ignore
    }
    return { ok: false, message: "The account could not be deleted. Please try again or contact support." };
  }

  await supabase.auth.signOut().catch(() => null);
  return { ok: true, next: "/?message=account_deleted" };
}
