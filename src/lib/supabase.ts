import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type AppRole = 'admin' | 'manager' | 'user' | 'candidate'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          full_name: string | null
          role: AppRole
          classe: string | null
          username: string | null
          member_number: number | null
          created_at: string
          updated_at: string
          auth_id: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          role?: AppRole
          classe?: string | null
          username?: string | null
          member_number?: number | null
          created_at?: string
          updated_at?: string
          auth_id: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          full_name?: string | null
          role?: AppRole
          classe?: string | null
          username?: string | null
          member_number?: number | null
          created_at?: string
          updated_at?: string
          auth_id?: string
        }
      }
      instrument_roles: {
        Row: { id: number; name: string; display_order: number; created_at: string }
        Insert: { id?: number; name: string; display_order?: number; created_at?: string }
        Update: { id?: number; name?: string; display_order?: number; created_at?: string }
      }
      member_instruments: {
        Row: { id: number; member_id: string; instrument_role_id: number; is_primary: boolean; created_at: string }
        Insert: { id?: number; member_id: string; instrument_role_id: number; is_primary?: boolean; created_at?: string }
        Update: { id?: number; member_id?: string; instrument_role_id?: number; is_primary?: boolean; created_at?: string }
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string
          album: string | null
          album_art_url: string | null
          duration_seconds: number | null
          spotify_id: string | null
          lastfm_id: string | null
          is_audition: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          album?: string | null
          album_art_url?: string | null
          duration_seconds?: number | null
          spotify_id?: string | null
          lastfm_id?: string | null
          is_audition?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          album?: string | null
          album_art_url?: string | null
          duration_seconds?: number | null
          spotify_id?: string | null
          lastfm_id?: string | null
          is_audition?: boolean
          archived_at?: string | null
          updated_at?: string
        }
      }
      setlists: {
        Row: {
          id: string
          name: string
          description: string | null
          event_date: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          event_date?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          event_date?: string | null
          archived_at?: string | null
          updated_at?: string
        }
      }
      setlist_songs: {
        Row: {
          id: string
          setlist_id: string
          song_id: string
          instrument_role_id: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          setlist_id: string
          song_id: string
          instrument_role_id: number
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          setlist_id?: string
          song_id?: string
          instrument_role_id?: number
          position?: number
        }
      }
      assignments: {
        Row: {
          id: string
          context_type: 'song' | 'setlist_song'
          context_id: string
          instrument_role_id: number
          member_id: string
          created_at: string
        }
        Insert: {
          id?: string
          context_type: 'song' | 'setlist_song'
          context_id: string
          instrument_role_id: number
          member_id: string
          created_at?: string
        }
        Update: {
          id?: string
          context_type?: 'song' | 'setlist_song'
          context_id?: string
          instrument_role_id?: number
          member_id?: string
        }
      }
      assignment_history: {
        Row: {
          id: string
          assignment_id: string
          action: string
          assigner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          action: string
          assigner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          action?: string
          assigner_id?: string
        }
      }
      events: {
        Row: { id: string; name: string; date: string; location: string | null; description: string | null; archived_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; date: string; location?: string | null; description?: string | null; archived_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; date?: string; location?: string | null; description?: string | null; archived_at?: string | null; updated_at?: string }
      }
      event_setlists: {
        Row: { id: string; event_id: string; setlist_id: string; created_at: string }
        Insert: { id?: string; event_id: string; setlist_id: string; created_at?: string }
        Update: { id?: string; event_id?: string; setlist_id?: string }
      }
      rehearsals: {
        Row: { id: string; title: string; start_time: string; end_time: string; location: string | null; notes: string | null; setlist_id: string | null; archived_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; start_time: string; end_time: string; location?: string | null; notes?: string | null; setlist_id?: string | null; archived_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; start_time?: string; end_time?: string; location?: string | null; notes?: string | null; setlist_id?: string | null; archived_at?: string | null; updated_at?: string }
      }
      rehearsal_participants: {
        Row: { id: string; rehearsal_id: string; member_id: string; role: 'participant' | 'leader'; created_at: string }
        Insert: { id?: string; rehearsal_id: string; member_id: string; role?: 'participant' | 'leader'; created_at?: string }
        Update: { id?: string; rehearsal_id?: string; member_id?: string; role?: 'participant' | 'leader' }
      }
      rehearsal_attendance: {
        Row: { id: string; rehearsal_id: string; member_id: string; status: 'available' | 'unavailable' | 'maybe'; note: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; rehearsal_id: string; member_id: string; status?: 'available' | 'unavailable' | 'maybe'; note?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; rehearsal_id?: string; member_id?: string; status?: 'available' | 'unavailable' | 'maybe'; note?: string | null; updated_at?: string }
      }
      song_proposals: {
        Row: { id: string; proposer_id: string; title: string; artist: string; spotify_id: string | null; lastfm_id: string | null; album: string | null; album_art_url: string | null; duration_seconds: number | null; reason: string | null; status: 'pending' | 'approved' | 'rejected'; associated_event_id: string | null; archived_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; proposer_id: string; title: string; artist: string; spotify_id?: string | null; lastfm_id?: string | null; album?: string | null; album_art_url?: string | null; duration_seconds?: number | null; reason?: string | null; status?: 'pending' | 'approved' | 'rejected'; associated_event_id?: string | null; archived_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; proposer_id?: string; title?: string; artist?: string; spotify_id?: string | null; lastfm_id?: string | null; album?: string | null; album_art_url?: string | null; duration_seconds?: number | null; reason?: string | null; status?: 'pending' | 'approved' | 'rejected'; associated_event_id?: string | null; archived_at?: string | null; updated_at?: string }
      }
      proposal_comments: {
        Row: { id: string; proposal_id: string; author_id: string; content: string; created_at: string }
        Insert: { id?: string; proposal_id: string; author_id: string; content: string; created_at?: string }
        Update: { id?: string; proposal_id?: string; author_id?: string; content?: string }
      }
      proposal_settings: {
        Row: { id: number; proposals_open: boolean; submission_window_start: string | null; submission_window_end: string | null; max_proposals_per_user: number }
        Insert: { id: number; proposals_open: boolean; submission_window_start?: string | null; submission_window_end?: string | null; max_proposals_per_user?: number }
        Update: { id?: number; proposals_open?: boolean; submission_window_start?: string | null; submission_window_end?: string | null; max_proposals_per_user?: number }
      }
      auditions: {
        Row: { id: string; title: string; description: string | null; date: string; location: string | null; application_deadline: string; max_applicants: number | null; max_instruments_per_applicant: number; archived_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; description?: string | null; date: string; location?: string | null; application_deadline: string; max_applicants?: number | null; max_instruments_per_applicant?: number; archived_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; description?: string | null; date?: string; location?: string | null; application_deadline?: string; max_applicants?: number | null; max_instruments_per_applicant?: number; archived_at?: string | null; updated_at?: string }
      }
      audition_applications: {
        Row: { id: string; audition_id: string; applicant_id: string; status: 'pending' | 'admitted' | 'rejected'; response_notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; audition_id: string; applicant_id: string; status?: 'pending' | 'admitted' | 'rejected'; response_notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; audition_id?: string; applicant_id?: string; status?: 'pending' | 'admitted' | 'rejected'; response_notes?: string | null; updated_at?: string }
      }
      audition_application_instruments: {
        Row: { id: string; application_id: string; instrument_role_id: number; song_id: string | null; status: 'pending' | 'admitted' | 'rejected'; created_at: string }
        Insert: { id?: string; application_id: string; instrument_role_id: number; song_id?: string | null; status?: 'pending' | 'admitted' | 'rejected'; created_at?: string }
        Update: { id?: string; application_id?: string; instrument_role_id?: number; song_id?: string | null; status?: 'pending' | 'admitted' | 'rejected' }
      }
      audition_instruments: {
        Row: { audition_id: string; instrument_role_id: number; created_at: string }
        Insert: { audition_id: string; instrument_role_id: number; created_at?: string }
        Update: { audition_id?: string; instrument_role_id?: number }
      }
      inventory_categories: {
        Row: { id: number; name: string; created_at: string }
        Insert: { id?: number; name: string; created_at?: string }
        Update: { id?: number; name?: string }
      }
      inventory_items: {
        Row: { id: string; name: string; category_id: number | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; category_id?: number | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; category_id?: number | null; updated_at?: string }
      }
      inventory_snapshots: {
        Row: { id: string; created_by: string; note: string | null; created_at: string }
        Insert: { id?: string; created_by: string; note?: string | null; created_at?: string }
        Update: { id?: string; created_by?: string; note?: string | null }
      }
      inventory_snapshot_items: {
        Row: { id: string; snapshot_id: string; item_id: string; quantity: number; created_at: string }
        Insert: { id?: string; snapshot_id: string; item_id: string; quantity?: number; created_at?: string }
        Update: { id?: string; snapshot_id?: string; item_id?: string; quantity?: number }
      }
      surveys: {
        Row: { id: string; title: string; description: string | null; questions: unknown; status: 'draft' | 'open' | 'closed'; survey_type: 'open' | 'logged_in'; collect_respondent: boolean; max_responses_per_user: number | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; description?: string | null; questions?: unknown; status?: 'draft' | 'open' | 'closed'; survey_type?: 'open' | 'logged_in'; collect_respondent?: boolean; max_responses_per_user?: number | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; description?: string | null; questions?: unknown; status?: 'draft' | 'open' | 'closed'; survey_type?: 'open' | 'logged_in'; collect_respondent?: boolean; max_responses_per_user?: number | null; updated_at?: string }
      }
      survey_responses: {
        Row: { id: string; survey_id: string; respondent_id: string | null; answers: unknown; created_at: string }
        Insert: { id?: string; survey_id: string; respondent_id?: string | null; answers?: unknown; created_at?: string }
        Update: { id?: string; survey_id?: string; respondent_id?: string | null; answers?: unknown }
      }
      app_settings: {
        Row: { id: number; login_banner_enabled: boolean; login_banner_message: string; login_banner_type: string; login_banner_expires_at: string | null; maintenance_mode: boolean; maintenance_message: string }
        Insert: { id: number; login_banner_enabled?: boolean; login_banner_message?: string; login_banner_type?: string; login_banner_expires_at?: string | null; maintenance_mode?: boolean; maintenance_message?: string }
        Update: { id?: number; login_banner_enabled?: boolean; login_banner_message?: string; login_banner_type?: string; login_banner_expires_at?: string | null; maintenance_mode?: boolean; maintenance_message?: string }
      }
      bulletin_posts: {
        Row: { id: string; title: string; body: string; author_id: string; author_name: string; pinned: boolean; visible_roles: string[]; created_at: string; updated_at: string }
        Insert: { id?: string; title: string; body?: string; author_id: string; author_name?: string; pinned?: boolean; visible_roles?: string[]; created_at?: string; updated_at?: string }
        Update: { id?: string; title?: string; body?: string; author_id?: string; author_name?: string; pinned?: boolean; visible_roles?: string[]; updated_at?: string }
      }
      bulletin_attachments: {
        Row: { id: string; post_id: string; storage_path: string; file_name: string; created_at: string }
        Insert: { id?: string; post_id: string; storage_path: string; file_name: string; created_at?: string }
        Update: { id?: string; post_id?: string; storage_path?: string; file_name?: string }
      }
      member_badges: {
        Row: { id: string; member_id: string; qr_token: string; short_code: string; admin_note: string; revoked_at: string | null; created_by: string; created_at: string }
        Insert: { id?: string; member_id: string; qr_token?: string; short_code?: string; admin_note?: string; revoked_at?: string | null; created_by: string; created_at?: string }
        Update: { id?: string; member_id?: string; qr_token?: string; short_code?: string; admin_note?: string; revoked_at?: string | null; created_by?: string }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { app_role: AppRole; participant_role: 'participant' | 'leader'; attendance_status: 'available' | 'unavailable' | 'maybe'; application_status: 'pending' | 'admitted' | 'rejected'; survey_status: 'draft' | 'open' | 'closed'; survey_type: 'open' | 'logged_in' }
    CompositeTypes: { [_ in never]: never }
  }
}
