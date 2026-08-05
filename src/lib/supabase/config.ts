const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfig() {
  return {
    supabaseUrl: supabaseUrl ?? "",
    supabaseAnonKey: supabaseAnonKey ?? "",
  };
}
