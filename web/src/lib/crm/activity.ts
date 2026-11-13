import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Records a change in activity_log via the log_activity() database function
 * (which stamps the tenant and user itself). Best effort: a failed log entry
 * never blocks the change it describes.
 */
export async function logActivity(
  supabase: SupabaseClient,
  entityType: "vehicle" | "customer" | "rental" | "invoice" | "expense" | "lead" | "user",
  entityId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.rpc("log_activity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action: action,
    p_details: details,
  });
  if (error) console.error("activity log failed:", error.message);
}
