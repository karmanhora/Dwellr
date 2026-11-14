/**
 * Hand-written subset of the generated Supabase types, covering Milestone 0.
 * Regenerate with `supabase gen types typescript --linked` once more tables
 * exist.
 *
 * Note: Row/Insert/Update are inline object literals on purpose. Supabase's
 * types require table rows to satisfy Record<string, unknown>, which
 * TypeScript interfaces do not (they lack an implicit index signature) — using
 * an interface here silently collapses query results to `never`.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
