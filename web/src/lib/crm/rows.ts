/**
 * Types a Supabase result list. Without generated database types,
 * supabase-js types joined many-to-one records (rental → customer) as
 * arrays, though PostgREST returns them as single objects; this cast says
 * what the query actually returns.
 */
export function rows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}
