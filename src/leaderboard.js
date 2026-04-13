import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = import.meta.env.VITE_SUPABASE_TABLE || "leaderboard_entries";

const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const client = enabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export function getLeaderboardConfig() {
  return {
    enabled,
    table: SUPABASE_TABLE,
  };
}

export async function fetchOnlineLeaderboard(limit = 10) {
  if (!enabled) {
    return { enabled: false, data: [], error: null };
  }

  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select("name,score,coins,level,skin,created_at")
    .order("score", { ascending: false })
    .limit(limit);

  return {
    enabled: true,
    data: data || [],
    error: error || null,
  };
}

export async function submitOnlineScore(entry) {
  if (!enabled) {
    return { enabled: false, data: null, error: null };
  }

  const payload = {
    name: entry.name,
    score: entry.score,
    coins: entry.coins,
    level: entry.level,
    skin: entry.skin,
  };

  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .insert([payload])
    .select("id")
    .limit(1);

  return {
    enabled: true,
    data: data?.[0] || null,
    error: error || null,
  };
}
