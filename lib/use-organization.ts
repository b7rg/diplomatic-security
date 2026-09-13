"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_ORG_TITLES, DEFAULT_ORG_UNITS, type OrgTitle, type OrgUnit } from "@/lib/organization-data";
import { OFFICIAL_ORG_KEYS } from "@/lib/site";

export function useOrganization({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const configured = isSupabaseConfigured();
  const [units, setUnits] = useState<OrgUnit[]>(DEFAULT_ORG_UNITS);
  const [titles, setTitles] = useState<OrgTitle[]>(DEFAULT_ORG_TITLES);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  async function reload() {
    const supabase = getSupabase();
    if (!supabase) {
      setUnits(DEFAULT_ORG_UNITS); setTitles(DEFAULT_ORG_TITLES); setLoading(false); return;
    }
    setLoading(true); setError("");
    const [unitResult, titleResult] = await Promise.all([
      supabase.from("organization_units").select("*").order("sort_order", { ascending: true }),
      supabase.from("organization_titles").select("*").order("sort_order", { ascending: true }),
    ]);
    if (unitResult.error || titleResult.error) {
      setError(unitResult.error?.message || titleResult.error?.message || "تعذر تحميل الهيكل");
      setUnits(DEFAULT_ORG_UNITS); setTitles(DEFAULT_ORG_TITLES);
    } else {
      const allowed = new Set<string>(OFFICIAL_ORG_KEYS);
      setUnits(((unitResult.data ?? []) as OrgUnit[]).filter(unit => allowed.has(unit.key)));
      setTitles(((titleResult.data ?? []) as OrgTitle[]).filter(title => allowed.has(title.unit_key)));
    }
    setLoading(false);
  }

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleUnits = useMemo(() => includeInactive ? units : units.filter(u => u.active), [units, includeInactive]);
  const visibleTitles = useMemo(() => includeInactive ? titles : titles.filter(t => t.active), [titles, includeInactive]);

  return { configured, units: visibleUnits, titles: visibleTitles, loading, error, reload, setUnits, setTitles };
}
