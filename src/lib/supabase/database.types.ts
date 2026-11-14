export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          member_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          dob: string | null;
          picture_url: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          dob?: string | null;
          picture_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          tracked_fields: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date?: string;
          tracked_fields?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          event_id: string;
          member_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          member_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
};
