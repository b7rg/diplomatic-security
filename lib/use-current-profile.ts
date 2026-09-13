"use client";

import { useEffect, useState } from "react";
import { DEMO_OWNER, type Profile } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function useCurrentProfile() {
  const configured = isSupabaseConfigured();
  const [profile, setProfile] = useState<Profile | null>(
    configured ? null : DEMO_OWNER
  );
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .single();

      setProfile((data ?? null) as Profile | null);
      setLoading(false);
    })();
  }, []);

  return { profile, loading, configured };
}
