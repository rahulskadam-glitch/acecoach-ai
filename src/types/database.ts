export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string;
          last_name: string;
          age: number | null;
          country: string;
          playing_level: string | null;
          dominant_hand: string | null;
          gender: string | null;
          height: string | null;
          weight: string | null;
          goals: string[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          first_name: string;
          last_name: string;
          age?: number | null;
          country: string;
          playing_level?: string | null;
          dominant_hand?: string | null;
          gender?: string | null;
          height?: string | null;
          weight?: string | null;
          goals?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string;
          last_name?: string;
          age?: number | null;
          country?: string;
          playing_level?: string | null;
          dominant_hand?: string | null;
          gender?: string | null;
          height?: string | null;
          weight?: string | null;
          goals?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          stroke_type: string | null;
          status: string;
          duration: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          storage_path: string;
          stroke_type?: string | null;
          status?: string;
          duration?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          storage_path?: string;
          stroke_type?: string | null;
          status?: string;
          duration?: number | null;
          created_at?: string | null;
        };
      };
      analysis: {
        Row: {
          id: string;
          video_id: string;
          overall_score: number;
          forehand_score: number;
          backhand_score: number;
          serve_score: number;
          footwork_score: number;
          balance_score: number;
          ai_summary: string;
          recommendations: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          video_id: string;
          overall_score: number;
          forehand_score: number;
          backhand_score: number;
          serve_score: number;
          footwork_score: number;
          balance_score: number;
          ai_summary: string;
          recommendations: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          video_id?: string;
          overall_score?: number;
          forehand_score?: number;
          backhand_score?: number;
          serve_score?: number;
          footwork_score?: number;
          balance_score?: number;
          ai_summary?: string;
          recommendations?: string;
          created_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
