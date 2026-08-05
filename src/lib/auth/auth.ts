import type { Session, User } from "@supabase/supabase-js";
import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthUser = User | null;

export function getBrowserAuthClient() {
  return createBrowserSupabaseClient();
}

export function browserAuthIsConfigured() {
  return isSupabaseConfigured();
}

export async function getBrowserSession(): Promise<Session | null> {
  const supabase = getBrowserAuthClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getBrowserAuthClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(email: string, password: string, metadata?: Record<string, string>) {
  const supabase = getBrowserAuthClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const supabase = getBrowserAuthClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function getServerAuthClient() {
  return createServerSupabaseClient();
}
