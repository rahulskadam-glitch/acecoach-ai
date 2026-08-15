import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

type AthlentraBrowserClient = SupabaseClient<Database>;

// Turbopack can re-evaluate this module during Fast Refresh. Keep one browser
// auth client for the lifetime of the page so GoTrue's flow settings are not
// reconstructed from a partially refreshed dependency graph.
const browserScope = globalThis as typeof globalThis & {
  __acecoachSupabaseClient?: AthlentraBrowserClient;
};

function createFallbackClient() {
  return {
    auth: {
      signInWithOAuth: async () => ({ data: { provider: "", url: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return createFallbackClient() as unknown as AthlentraBrowserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return createFallbackClient() as unknown as AthlentraBrowserClient;
  }

  if (typeof window !== "undefined" && browserScope.__acecoachSupabaseClient) {
    return browserScope.__acecoachSupabaseClient;
  }

  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  // Never cache this client while rendering on the server: a server-side
  // singleton could share session state between requests.
  if (typeof window !== "undefined") {
    browserScope.__acecoachSupabaseClient = client;
  }

  return client;
}

export { isSupabaseConfigured };
