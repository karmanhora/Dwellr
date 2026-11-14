/**
 * Hand-written subset of the generated Supabase types, covering Milestones 0–1.
 * Regenerate with `supabase gen types typescript --linked` when convenient.
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
      properties: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string | null;
          listing_status: "for_sale" | "off_market" | "sold" | "unknown";
          price_cents: number | null;
          currency: string;
          bedrooms: number | null;
          bathrooms: number | null;
          square_feet: number | null;
          property_type:
            | "house"
            | "apartment"
            | "condo"
            | "townhouse"
            | "multi_family"
            | "land"
            | "other";
          neighborhood: string;
          city: string;
          state: string | null;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description?: string | null;
          listing_status?: "for_sale" | "off_market" | "sold" | "unknown";
          price_cents?: number | null;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          square_feet?: number | null;
          property_type?:
            | "house"
            | "apartment"
            | "condo"
            | "townhouse"
            | "multi_family"
            | "land"
            | "other";
          neighborhood: string;
          city: string;
          state?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          listing_status?: "for_sale" | "off_market" | "sold" | "unknown";
          price_cents?: number | null;
          currency?: string;
          bedrooms?: number | null;
          bathrooms?: number | null;
          square_feet?: number | null;
          property_type?:
            | "house"
            | "apartment"
            | "condo"
            | "townhouse"
            | "multi_family"
            | "land"
            | "other";
          neighborhood?: string;
          city?: string;
          state?: string | null;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey";
            columns: ["created_by"];
            isOneRelation: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      property_photos: {
        Row: {
          id: string;
          property_id: string;
          storage_path: string;
          position: number;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          storage_path: string;
          position?: number;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          position?: number;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey";
            columns: ["property_id"];
            isOneRelation: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          share_slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          share_slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_public?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "collections_owner_id_fkey";
            columns: ["owner_id"];
            isOneRelation: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_items: {
        Row: {
          collection_id: string;
          property_id: string;
          added_by: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          property_id: string;
          added_by: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneRelation: true;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_property_id_fkey";
            columns: ["property_id"];
            isOneRelation: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_added_by_fkey";
            columns: ["added_by"];
            isOneRelation: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      property_saves: {
        Row: {
          property_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          property_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_saves_property_id_fkey";
            columns: ["property_id"];
            isOneRelation: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_saves_user_id_fkey";
            columns: ["user_id"];
            isOneRelation: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      property_field_provenance: {
        Row: {
          property_id: string;
          field: "title" | "description" | "listing_status" | "price" | "bedrooms" | "bathrooms" | "square_feet" | "property_type" | "neighborhood" | "city" | "state" | "postal_code" | "location";
          provenance: "user_submitted" | "verified";
          verified_at: string | null;
          source_ref: string | null;
        };
        Insert: {
          property_id: string;
          field: "title" | "description" | "listing_status" | "price" | "bedrooms" | "bathrooms" | "square_feet" | "property_type" | "neighborhood" | "city" | "state" | "postal_code" | "location";
          provenance?: "user_submitted" | "verified";
          verified_at?: string | null;
          source_ref?: string | null;
        };
        Update: {
          provenance?: "user_submitted" | "verified";
          verified_at?: string | null;
          source_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "property_field_provenance_property_id_fkey";
            columns: ["property_id"];
            isOneRelation: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      listing_status: "for_sale" | "off_market" | "sold" | "unknown";
      property_type:
        | "house"
        | "apartment"
        | "condo"
        | "townhouse"
        | "multi_family"
        | "land"
        | "other";
      field_provenance: "user_submitted" | "verified";
    };
    CompositeTypes: Record<never, never>;
  };
};
