import { toPriceCut, type PriceCut } from "@hauscrawl/core";

import { createClient } from "@/lib/supabase/server";

type PriceChangeRow = {
  property_id: string;
  price_cents: number;
  previous_price_cents: number | null;
  recorded_at: string;
};

/**
 * Latest observed price change for each property. Only the newest row per
 * property is considered, so an old cut never resurfaces after a later
 * increase. Rows come from a trigger on real property writes.
 */
export async function getLatestPriceCuts(
  propertyIds: readonly string[],
): Promise<Map<string, PriceCut>> {
  const cuts = new Map<string, PriceCut>();
  if (propertyIds.length === 0) return cuts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_price_history")
    .select("property_id, price_cents, previous_price_cents, recorded_at")
    .in("property_id", [...propertyIds])
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("[price-history] lookup failed:", error.message);
    return cuts;
  }

  const seen = new Set<string>();
  for (const row of (data ?? []) as PriceChangeRow[]) {
    if (seen.has(row.property_id)) continue;
    seen.add(row.property_id);
    const cut = toPriceCut(row);
    if (cut) cuts.set(row.property_id, cut);
  }

  return cuts;
}
