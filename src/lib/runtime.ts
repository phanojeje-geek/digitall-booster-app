export const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Demo mode must be explicitly enabled.
// Never auto-fallback to demo when Supabase env is missing, otherwise production can silently run as "utilisateur simple".
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
