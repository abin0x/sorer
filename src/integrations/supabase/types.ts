export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      age_groups: {
        Row: {
          age_group: string | null
          birth_date_end: string | null
          birth_date_start: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          order: number | null
          playing_format: string | null
          season_id: string | null
          season_name: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          birth_date_end?: string | null
          birth_date_start?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          order?: number | null
          playing_format?: string | null
          season_id?: string | null
          season_name?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          birth_date_end?: string | null
          birth_date_start?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          order?: number | null
          playing_format?: string | null
          season_id?: string | null
          season_name?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      app_configs: {
        Row: {
          config_key: string | null
          config_value: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          updated_date: string
        }
        Insert: {
          config_key?: string | null
          config_value?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          updated_date?: string
        }
        Update: {
          config_key?: string | null
          config_value?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          updated_date?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          is_sample: boolean | null
          metadata: Json | null
          updated_date: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_sample?: boolean | null
          metadata?: Json | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_sample?: boolean | null
          metadata?: Json | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      base44_purchases: {
        Row: {
          amount: string | null
          appUserId: string | null
          buyerEmail: string | null
          canceledAt: string | null
          checkoutSessionId: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string | null
          id: string
          is_sample: boolean | null
          orderId: string | null
          paidAt: string | null
          plan_tier: string | null
          productId: string | null
          productName: string | null
          quantity: number | null
          status: string | null
          subscriptionId: string | null
          updated_date: string
        }
        Insert: {
          amount?: string | null
          appUserId?: string | null
          buyerEmail?: string | null
          canceledAt?: string | null
          checkoutSessionId?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          id?: string
          is_sample?: boolean | null
          orderId?: string | null
          paidAt?: string | null
          plan_tier?: string | null
          productId?: string | null
          productName?: string | null
          quantity?: number | null
          status?: string | null
          subscriptionId?: string | null
          updated_date?: string
        }
        Update: {
          amount?: string | null
          appUserId?: string | null
          buyerEmail?: string | null
          canceledAt?: string | null
          checkoutSessionId?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          id?: string
          is_sample?: boolean | null
          orderId?: string | null
          paidAt?: string | null
          plan_tier?: string | null
          productId?: string | null
          productName?: string | null
          quantity?: number | null
          status?: string | null
          subscriptionId?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      beacon_reports: {
        Row: {
          channel_id: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          details: string | null
          id: string
          message_id: string
          reason: string
          reporter_email: string | null
          reporter_user_id: string
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_date: string
        }
        Insert: {
          channel_id?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reporter_email?: string | null
          reporter_user_id?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_date?: string
        }
        Update: {
          channel_id?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reporter_email?: string | null
          reporter_user_id?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_date?: string
        }
        Relationships: []
      }
      beacon_team_accesses: {
        Row: {
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          team_ids: string[]
          updated_date: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          team_ids?: string[]
          updated_date?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          team_ids?: string[]
          updated_date?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          arrive_minutes_before: number | null
          away_team_id: string | null
          away_team_name: string | null
          calendar_synced: boolean | null
          clock_elapsed_seconds: number
          clock_started_at: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          end_datetime: string | null
          event_type: string | null
          facility_id: string | null
          field_id: string | null
          field_name: string | null
          final_posted_at: string | null
          home_team_id: string | null
          home_team_name: string | null
          id: string
          is_away: boolean | null
          is_external_opponent: boolean | null
          is_recurring: boolean | null
          is_sample: boolean | null
          kit: string | null
          location_text: string | null
          notes: string | null
          notified: boolean | null
          notified_at: string | null
          opponent_name: string | null
          opponent_score: number
          period: string
          program_id: string | null
          program_title: string | null
          recurrence_group_id: string | null
          rsvp_required: boolean | null
          rsvps: Json | null
          season: string | null
          start_datetime: string | null
          status: string | null
          team_ids: Json | null
          team_names: Json | null
          team_score: number
          title: string | null
          updated_date: string
          visibility: string | null
          volunteer_slots: Json
        }
        Insert: {
          arrive_minutes_before?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          calendar_synced?: boolean | null
          clock_elapsed_seconds?: number
          clock_started_at?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_datetime?: string | null
          event_type?: string | null
          facility_id?: string | null
          field_id?: string | null
          field_name?: string | null
          final_posted_at?: string | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          is_away?: boolean | null
          is_external_opponent?: boolean | null
          is_recurring?: boolean | null
          is_sample?: boolean | null
          kit?: string | null
          location_text?: string | null
          notes?: string | null
          notified?: boolean | null
          notified_at?: string | null
          opponent_name?: string | null
          opponent_score?: number
          period?: string
          program_id?: string | null
          program_title?: string | null
          recurrence_group_id?: string | null
          rsvp_required?: boolean | null
          rsvps?: Json | null
          season?: string | null
          start_datetime?: string | null
          status?: string | null
          team_ids?: Json | null
          team_names?: Json | null
          team_score?: number
          title?: string | null
          updated_date?: string
          visibility?: string | null
          volunteer_slots?: Json
        }
        Update: {
          arrive_minutes_before?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          calendar_synced?: boolean | null
          clock_elapsed_seconds?: number
          clock_started_at?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_datetime?: string | null
          event_type?: string | null
          facility_id?: string | null
          field_id?: string | null
          field_name?: string | null
          final_posted_at?: string | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          is_away?: boolean | null
          is_external_opponent?: boolean | null
          is_recurring?: boolean | null
          is_sample?: boolean | null
          kit?: string | null
          location_text?: string | null
          notes?: string | null
          notified?: boolean | null
          notified_at?: string | null
          opponent_name?: string | null
          opponent_score?: number
          period?: string
          program_id?: string | null
          program_title?: string | null
          recurrence_group_id?: string | null
          rsvp_required?: boolean | null
          rsvps?: Json | null
          season?: string | null
          start_datetime?: string | null
          status?: string | null
          team_ids?: Json | null
          team_names?: Json | null
          team_score?: number
          title?: string | null
          updated_date?: string
          visibility?: string | null
          volunteer_slots?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          club_id: string | null
          color: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          name: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          color?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          color?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          ack_required: boolean
          acknowledged_by: Json
          action_label: string | null
          action_url: string | null
          attachment_kind: string | null
          attachment_name: string | null
          attachment_uri: string | null
          author_email: string | null
          author_name: string | null
          author_role: string | null
          author_user_id: string | null
          channel_id: string
          channel_type: string | null
          club_id: string
          content: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          edited_at: string | null
          escalated_at: string | null
          escalation_summary: Json | null
          game_card: Json | null
          id: string
          image_uri: string | null
          is_priority: boolean
          kind: string
          location: Json | null
          moderation_status: string | null
          original_content: string | null
          parent_id: string | null
          poll_options: Json | null
          poll_votes: Json | null
          reactions: Json
          read_by: Json
          report_count: number
          rsvps: Json
          soft_deleted: boolean
          team_id: string | null
          updated_date: string
          urgency: string
        }
        Insert: {
          ack_required?: boolean
          acknowledged_by?: Json
          action_label?: string | null
          action_url?: string | null
          attachment_kind?: string | null
          attachment_name?: string | null
          attachment_uri?: string | null
          author_email?: string | null
          author_name?: string | null
          author_role?: string | null
          author_user_id?: string | null
          channel_id: string
          channel_type?: string | null
          club_id: string
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          edited_at?: string | null
          escalated_at?: string | null
          escalation_summary?: Json | null
          game_card?: Json | null
          id?: string
          image_uri?: string | null
          is_priority?: boolean
          kind?: string
          location?: Json | null
          moderation_status?: string | null
          original_content?: string | null
          parent_id?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          reactions?: Json
          read_by?: Json
          report_count?: number
          rsvps?: Json
          soft_deleted?: boolean
          team_id?: string | null
          updated_date?: string
          urgency?: string
        }
        Update: {
          ack_required?: boolean
          acknowledged_by?: Json
          action_label?: string | null
          action_url?: string | null
          attachment_kind?: string | null
          attachment_name?: string | null
          attachment_uri?: string | null
          author_email?: string | null
          author_name?: string | null
          author_role?: string | null
          author_user_id?: string | null
          channel_id?: string
          channel_type?: string | null
          club_id?: string
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          edited_at?: string | null
          escalated_at?: string | null
          escalation_summary?: Json | null
          game_card?: Json | null
          id?: string
          image_uri?: string | null
          is_priority?: boolean
          kind?: string
          location?: Json | null
          moderation_status?: string | null
          original_content?: string | null
          parent_id?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          reactions?: Json
          read_by?: Json
          report_count?: number
          rsvps?: Json
          soft_deleted?: boolean
          team_id?: string | null
          updated_date?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          allow_replies: boolean | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_default: boolean | null
          moderation_mode: string | null
          name: string
          scope: string
          sort_order: number | null
          team_id: string | null
          team_name: string | null
          type: string
          updated_date: string
        }
        Insert: {
          allow_replies?: boolean | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          moderation_mode?: string | null
          name: string
          scope?: string
          sort_order?: number | null
          team_id?: string | null
          team_name?: string | null
          type: string
          updated_date?: string
        }
        Update: {
          allow_replies?: boolean | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          moderation_mode?: string | null
          name?: string
          scope?: string
          sort_order?: number | null
          team_id?: string | null
          team_name?: string | null
          type?: string
          updated_date?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          edited: boolean | null
          file_name: string | null
          file_url: string | null
          id: string
          is_sample: boolean | null
          mentioned_users: Json | null
          message: string | null
          message_type: string | null
          program_id: string | null
          read_by: Json | null
          reply_to: string | null
          sender_email: string | null
          sender_name: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          edited?: boolean | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_sample?: boolean | null
          mentioned_users?: Json | null
          message?: string | null
          message_type?: string | null
          program_id?: string | null
          read_by?: Json | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          edited?: boolean | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_sample?: boolean | null
          mentioned_users?: Json | null
          message?: string | null
          message_type?: string | null
          program_id?: string | null
          read_by?: Json | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      club_credentials: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          quickbooks_client_id: string | null
          quickbooks_client_secret: string | null
          resend_api_key: string | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          quickbooks_client_id?: string | null
          quickbooks_client_secret?: string | null
          resend_api_key?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          quickbooks_client_id?: string | null
          quickbooks_client_secret?: string | null
          resend_api_key?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      club_integration_vault_refs: {
        Row: {
          club_id: string
          provider: string
          updated_at: string
          vault_secret_id: string
        }
        Insert: {
          club_id: string
          provider: string
          updated_at?: string
          vault_secret_id: string
        }
        Update: {
          club_id?: string
          provider?: string
          updated_at?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      club_integrations: {
        Row: {
          club_id: string
          connected_at: string | null
          connected_by: string | null
          created_at: string
          display_name: string | null
          external_account_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_integrations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          accepted_by_user_id: string | null
          accepted_date: string | null
          access_level: string | null
          club_id: string | null
          club_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          delivery_status: string | null
          email: string | null
          id: string
          intended_roles: Json | null
          invited_by_email: string | null
          invited_by_name: string | null
          invitee_name: string | null
          is_sample: boolean | null
          last_error: string | null
          last_reminded_date: string | null
          opened_date: string | null
          received_date: string | null
          reminder_count: number
          resend_email_id: string | null
          role: string | null
          role_label: string | null
          sent_date: string | null
          status: string | null
          token: string | null
          updated_date: string
        }
        Insert: {
          accepted_by_user_id?: string | null
          accepted_date?: string | null
          access_level?: string | null
          club_id?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          delivery_status?: string | null
          email?: string | null
          id?: string
          intended_roles?: Json | null
          invited_by_email?: string | null
          invited_by_name?: string | null
          invitee_name?: string | null
          is_sample?: boolean | null
          last_error?: string | null
          last_reminded_date?: string | null
          opened_date?: string | null
          received_date?: string | null
          reminder_count?: number
          resend_email_id?: string | null
          role?: string | null
          role_label?: string | null
          sent_date?: string | null
          status?: string | null
          token?: string | null
          updated_date?: string
        }
        Update: {
          accepted_by_user_id?: string | null
          accepted_date?: string | null
          access_level?: string | null
          club_id?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          delivery_status?: string | null
          email?: string | null
          id?: string
          intended_roles?: Json | null
          invited_by_email?: string | null
          invited_by_name?: string | null
          invitee_name?: string | null
          is_sample?: boolean | null
          last_error?: string | null
          last_reminded_date?: string | null
          opened_date?: string | null
          received_date?: string | null
          reminder_count?: number
          resend_email_id?: string | null
          role?: string | null
          role_label?: string | null
          sent_date?: string | null
          status?: string | null
          token?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["club_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_oauth_states: {
        Row: {
          club_id: string
          code_verifier: string | null
          created_at: string
          expires_at: string
          origin: string
          provider: string
          state: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          code_verifier?: string | null
          created_at?: string
          expires_at: string
          origin: string
          provider: string
          state: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          origin?: string
          provider?: string
          state?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      club_quick_books_connections: {
        Row: {
          access_token: string | null
          club_id: string | null
          connected_by: string | null
          connected_date: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          is_sandbox: boolean | null
          realm_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_date: string
        }
        Insert: {
          access_token?: string | null
          club_id?: string | null
          connected_by?: string | null
          connected_date?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          is_sandbox?: boolean | null
          realm_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_date?: string
        }
        Update: {
          access_token?: string | null
          club_id?: string | null
          connected_by?: string | null
          connected_date?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          is_sandbox?: boolean | null
          realm_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          address: string | null
          admin_name: string | null
          app_name: string | null
          billing_email: string | null
          club_type: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          derived_brand_colors: Json
          director_name: string | null
          id: string
          internal_notes: string | null
          is_active: boolean | null
          is_demo: boolean | null
          is_sample: boolean | null
          logo_url: string | null
          max_branches: number | null
          max_players: number | null
          max_teams: number | null
          name: string | null
          onboarded_by_user_id: string | null
          plan_tier: string | null
          preferred_payment_provider: string | null
          primary_color: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          quickbooks_connected: boolean | null
          quickbooks_realm_id: string | null
          resend_domain_id: string | null
          resend_domain_name: string | null
          resend_domain_status: string | null
          secondary_color: string | null
          slug: string | null
          status: string | null
          stripe_account_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          terminology: Json
          trial_ends_at: string | null
          updated_date: string
        }
        Insert: {
          address?: string | null
          admin_name?: string | null
          app_name?: string | null
          billing_email?: string | null
          club_type?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          derived_brand_colors?: Json
          director_name?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          is_demo?: boolean | null
          is_sample?: boolean | null
          logo_url?: string | null
          max_branches?: number | null
          max_players?: number | null
          max_teams?: number | null
          name?: string | null
          onboarded_by_user_id?: string | null
          plan_tier?: string | null
          preferred_payment_provider?: string | null
          primary_color?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quickbooks_connected?: boolean | null
          quickbooks_realm_id?: string | null
          resend_domain_id?: string | null
          resend_domain_name?: string | null
          resend_domain_status?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string | null
          stripe_account_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          terminology?: Json
          trial_ends_at?: string | null
          updated_date?: string
        }
        Update: {
          address?: string | null
          admin_name?: string | null
          app_name?: string | null
          billing_email?: string | null
          club_type?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          derived_brand_colors?: Json
          director_name?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          is_demo?: boolean | null
          is_sample?: boolean | null
          logo_url?: string | null
          max_branches?: number | null
          max_players?: number | null
          max_teams?: number | null
          name?: string | null
          onboarded_by_user_id?: string | null
          plan_tier?: string | null
          preferred_payment_provider?: string | null
          primary_color?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quickbooks_connected?: boolean | null
          quickbooks_realm_id?: string | null
          resend_domain_id?: string | null
          resend_domain_name?: string | null
          resend_domain_status?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string | null
          stripe_account_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          terminology?: Json
          trial_ends_at?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          email: string | null
          first_name: string | null
          id: string
          is_sample: boolean | null
          last_name: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          phone: string | null
          role: string | null
          status: string | null
          team_id: string | null
          team_name: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_name?: string | null
          location_id?: string | null
          location_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_name?: string | null
          location_id?: string | null
          location_name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      curriculum_documents: {
        Row: {
          category: string | null
          club_id: string | null
          content_text: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          tags: Json | null
          title: string | null
          updated_date: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          category?: string | null
          club_id?: string | null
          content_text?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          tags?: Json | null
          title?: string | null
          updated_date?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          category?: string | null
          club_id?: string | null
          content_text?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          tags?: Json | null
          title?: string | null
          updated_date?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: []
      }
      demo_access_requests: {
        Row: {
          access_token: string | null
          branch_count: string | null
          club_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          email: string | null
          id: string
          invite_opened_date: string | null
          invite_sent: boolean | null
          invite_sent_date: string | null
          is_sample: boolean | null
          message: string | null
          name: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          source: string | null
          sport: string | null
          status: string | null
          trial_club_id: string | null
          trial_club_name: string | null
          trial_started_date: string | null
          updated_date: string
        }
        Insert: {
          access_token?: string | null
          branch_count?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          id?: string
          invite_opened_date?: string | null
          invite_sent?: boolean | null
          invite_sent_date?: string | null
          is_sample?: boolean | null
          message?: string | null
          name?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          source?: string | null
          sport?: string | null
          status?: string | null
          trial_club_id?: string | null
          trial_club_name?: string | null
          trial_started_date?: string | null
          updated_date?: string
        }
        Update: {
          access_token?: string | null
          branch_count?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          id?: string
          invite_opened_date?: string | null
          invite_sent?: boolean | null
          invite_sent_date?: string | null
          is_sample?: boolean | null
          message?: string | null
          name?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          source?: string | null
          sport?: string | null
          status?: string | null
          trial_club_id?: string | null
          trial_club_name?: string | null
          trial_started_date?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      device_push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_sample: boolean | null
          previous_version_id: string | null
          program_id: string | null
          stage: string | null
          tags: Json | null
          task_id: string | null
          updated_date: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_sample?: boolean | null
          previous_version_id?: string | null
          program_id?: string | null
          stage?: string | null
          tags?: Json | null
          task_id?: string | null
          updated_date?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_sample?: boolean | null
          previous_version_id?: string | null
          program_id?: string | null
          stage?: string | null
          tags?: Json | null
          task_id?: string | null
          updated_date?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          error_message: string | null
          id: string
          is_sample: boolean | null
          recipient_email: string | null
          recipient_name: string | null
          related_expense_id: string | null
          related_program_id: string | null
          related_staffpay_id: string | null
          related_task_id: string | null
          sent_by: string | null
          status: string | null
          subject: string | null
          template_type: string | null
          updated_date: string
        }
        Insert: {
          body?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          id?: string
          is_sample?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          related_expense_id?: string | null
          related_program_id?: string | null
          related_staffpay_id?: string | null
          related_task_id?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          template_type?: string | null
          updated_date?: string
        }
        Update: {
          body?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          error_message?: string | null
          id?: string
          is_sample?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          related_expense_id?: string | null
          related_program_id?: string | null
          related_staffpay_id?: string | null
          related_task_id?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          template_type?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          subject: string | null
          template_type: string | null
          updated_date: string
        }
        Insert: {
          body?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          subject?: string | null
          template_type?: string | null
          updated_date?: string
        }
        Update: {
          body?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          subject?: string | null
          template_type?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      entitlement_events: {
        Row: {
          action: string
          actor: string
          club_id: string
          created_at: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          from_status: string | null
          id: string
          is_sample: boolean | null
          metadata: Json
          module_key: string
          reason: string | null
          to_status: string | null
          updated_at: string
          updated_date: string
        }
        Insert: {
          action: string
          actor: string
          club_id: string
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          from_status?: string | null
          id?: string
          is_sample?: boolean | null
          metadata?: Json
          module_key: string
          reason?: string | null
          to_status?: string | null
          updated_at?: string
          updated_date?: string
        }
        Update: {
          action?: string
          actor?: string
          club_id?: string
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          from_status?: string | null
          id?: string
          is_sample?: boolean | null
          metadata?: Json
          module_key?: string
          reason?: string | null
          to_status?: string | null
          updated_at?: string
          updated_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number | null
          approval_date: string | null
          approval_notes: string | null
          approved_by: string | null
          assigned_to: string | null
          category: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          date: string | null
          description: string | null
          id: string
          is_sample: boolean | null
          payment_status: string | null
          program_id: string | null
          status: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          amount?: number | null
          approval_date?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          is_sample?: boolean | null
          payment_status?: string | null
          program_id?: string | null
          status?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          amount?: number | null
          approval_date?: string | null
          approval_notes?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          id?: string
          is_sample?: boolean | null
          payment_status?: string | null
          program_id?: string | null
          status?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          available_days: Json | null
          branch_ids: Json | null
          branch_names: Json | null
          capacity: number | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          daily_hours: Json | null
          field_count: number | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          location_id: string | null
          location_name: string | null
          name: string | null
          notes: string | null
          operating_hours: string | null
          phone: string | null
          surface_type: string | null
          updated_date: string
        }
        Insert: {
          address?: string | null
          available_days?: Json | null
          branch_ids?: Json | null
          branch_names?: Json | null
          capacity?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          daily_hours?: Json | null
          field_count?: number | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          location_id?: string | null
          location_name?: string | null
          name?: string | null
          notes?: string | null
          operating_hours?: string | null
          phone?: string | null
          surface_type?: string | null
          updated_date?: string
        }
        Update: {
          address?: string | null
          available_days?: Json | null
          branch_ids?: Json | null
          branch_names?: Json | null
          capacity?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          daily_hours?: Json | null
          field_count?: number | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          location_id?: string | null
          location_name?: string | null
          name?: string | null
          notes?: string | null
          operating_hours?: string | null
          phone?: string | null
          surface_type?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      fields: {
        Row: {
          available_days: Json | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          daily_hours: Json | null
          facility_id: string | null
          facility_name: string | null
          format_supported: Json | null
          id: string
          indoor_outdoor: string | null
          is_sample: boolean | null
          lighted: boolean | null
          max_sections: number | null
          name: string | null
          notes: string | null
          status: string | null
          surface: string | null
          updated_date: string
        }
        Insert: {
          available_days?: Json | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          daily_hours?: Json | null
          facility_id?: string | null
          facility_name?: string | null
          format_supported?: Json | null
          id?: string
          indoor_outdoor?: string | null
          is_sample?: boolean | null
          lighted?: boolean | null
          max_sections?: number | null
          name?: string | null
          notes?: string | null
          status?: string | null
          surface?: string | null
          updated_date?: string
        }
        Update: {
          available_days?: Json | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          daily_hours?: Json | null
          facility_id?: string | null
          facility_name?: string | null
          format_supported?: Json | null
          id?: string
          indoor_outdoor?: string | null
          is_sample?: boolean | null
          lighted?: boolean | null
          max_sections?: number | null
          name?: string | null
          notes?: string | null
          status?: string | null
          surface?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          away_score: number | null
          away_team_name: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string | null
          division: string | null
          field_id: string | null
          field_name: string | null
          game_number: number | null
          group_name: string | null
          home_score: number | null
          home_team_name: string | null
          id: string
          is_played: boolean | null
          is_sample: boolean | null
          referee_name: string | null
          round: string | null
          scheduled_date: string | null
          start_time: string | null
          status: string | null
          tournament_id: string | null
          updated_date: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_name?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          division?: string | null
          field_id?: string | null
          field_name?: string | null
          game_number?: number | null
          group_name?: string | null
          home_score?: number | null
          home_team_name?: string | null
          id?: string
          is_played?: boolean | null
          is_sample?: boolean | null
          referee_name?: string | null
          round?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          status?: string | null
          tournament_id?: string | null
          updated_date?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_name?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          division?: string | null
          field_id?: string | null
          field_name?: string | null
          game_number?: number | null
          group_name?: string | null
          home_score?: number | null
          home_team_name?: string | null
          id?: string
          is_played?: boolean | null
          is_sample?: boolean | null
          referee_name?: string | null
          round?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          status?: string | null
          tournament_id?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      guardians: {
        Row: {
          address_line_2: string | null
          city: string | null
          club_id: string | null
          country: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          household_id: string | null
          id: string
          is_sample: boolean | null
          is_test_user: boolean | null
          last_name: string | null
          notes: string | null
          phone: string | null
          player_ids: Json | null
          relationship: string | null
          state: string | null
          street_address: string | null
          unique_id: string | null
          updated_date: string
          user_id: string | null
          username: string | null
          zip_code: string | null
        }
        Insert: {
          address_line_2?: string | null
          city?: string | null
          club_id?: string | null
          country?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          household_id?: string | null
          id?: string
          is_sample?: boolean | null
          is_test_user?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          player_ids?: Json | null
          relationship?: string | null
          state?: string | null
          street_address?: string | null
          unique_id?: string | null
          updated_date?: string
          user_id?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line_2?: string | null
          city?: string | null
          club_id?: string | null
          country?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          household_id?: string | null
          id?: string
          is_sample?: boolean | null
          is_test_user?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          player_ids?: Json | null
          relationship?: string | null
          state?: string | null
          street_address?: string | null
          unique_id?: string | null
          updated_date?: string
          user_id?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      leagues: {
        Row: {
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          name: string | null
          notes: string | null
          updated_date: string
        }
        Insert: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          updated_date?: string
        }
        Update: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          branch_admin_email: string | null
          branch_admin_name: string | null
          branch_director_email: string | null
          branch_director_name: string | null
          branch_type: string | null
          city: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          facilities: Json | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          location_admin_email: string | null
          location_director_email: string | null
          name: string | null
          notes: string | null
          phone: string | null
          role_description: string | null
          state: string | null
          updated_date: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          branch_admin_email?: string | null
          branch_admin_name?: string | null
          branch_director_email?: string | null
          branch_director_name?: string | null
          branch_type?: string | null
          city?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          facilities?: Json | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          location_admin_email?: string | null
          location_director_email?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          role_description?: string | null
          state?: string | null
          updated_date?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          branch_admin_email?: string | null
          branch_admin_name?: string | null
          branch_director_email?: string | null
          branch_director_name?: string | null
          branch_type?: string | null
          city?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          facilities?: Json | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          location_admin_email?: string | null
          location_director_email?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          role_description?: string | null
          state?: string | null
          updated_date?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          checkout_mode: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          fee_coverage: number
          id: string
          is_sample: boolean | null
          items: Json
          order_number: string | null
          paid_at: string | null
          payment_provider: string | null
          processor_form_url: string | null
          processor_transaction_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          subtotal: number
          total: number
          updated_date: string
          user_id: string | null
        }
        Insert: {
          checkout_mode?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          fee_coverage?: number
          id?: string
          is_sample?: boolean | null
          items?: Json
          order_number?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          processor_form_url?: string | null
          processor_transaction_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal: number
          total: number
          updated_date?: string
          user_id?: string | null
        }
        Update: {
          checkout_mode?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          fee_coverage?: number
          id?: string
          is_sample?: boolean | null
          items?: Json
          order_number?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          processor_form_url?: string | null
          processor_transaction_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal?: number
          total?: number
          updated_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          club_id: string | null
          content: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_announcement: boolean | null
          is_sample: boolean | null
          program_id: string | null
          sender_email: string | null
          sender_name: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_announcement?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_announcement?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      module_catalogs: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string
          description: string | null
          features: Json
          icon: string | null
          id: string
          is_active: boolean
          is_sample: boolean | null
          key: string
          name: string
          nav_items: Json
          price_monthly: number | null
          route_paths: Json
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
          updated_date: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string
          description?: string | null
          features?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean | null
          key: string
          name: string
          nav_items?: Json
          price_monthly?: number | null
          route_paths?: Json
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          updated_date?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string
          description?: string | null
          features?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean | null
          key?: string
          name?: string
          nav_items?: Json
          price_monthly?: number | null
          route_paths?: Json
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
          updated_date?: string
        }
        Relationships: []
      }
      monsters: {
        Row: {
          actions: Json | null
          alignment: string | null
          armor_class: number | null
          challenge: number | null
          charisma: number | null
          constitution: number | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          dexterity: number | null
          hit_points: number | null
          id: string
          intelligence: number | null
          is_sample: boolean | null
          name: string | null
          size: string | null
          speed: string | null
          strength: number | null
          type: string | null
          updated_date: string
          wisdom: number | null
        }
        Insert: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          challenge?: number | null
          charisma?: number | null
          constitution?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          dexterity?: number | null
          hit_points?: number | null
          id?: string
          intelligence?: number | null
          is_sample?: boolean | null
          name?: string | null
          size?: string | null
          speed?: string | null
          strength?: number | null
          type?: string | null
          updated_date?: string
          wisdom?: number | null
        }
        Update: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          challenge?: number | null
          charisma?: number | null
          constitution?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          dexterity?: number | null
          hit_points?: number | null
          id?: string
          intelligence?: number | null
          is_sample?: boolean | null
          name?: string | null
          size?: string | null
          speed?: string | null
          strength?: number | null
          type?: string | null
          updated_date?: string
          wisdom?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          club_id: string | null
          content: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          program_id: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          program_id?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          content?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          program_id?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      notification_matrixes: {
        Row: {
          audience: string | null
          channels: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          is_sample: boolean | null
          module: string | null
          order: number | null
          subject_template: string | null
          trigger_event: string | null
          updated_date: string
        }
        Insert: {
          audience?: string | null
          channels?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_sample?: boolean | null
          module?: string | null
          order?: number | null
          subject_template?: string | null
          trigger_event?: string | null
          updated_date?: string
        }
        Update: {
          audience?: string | null
          channels?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          is_sample?: boolean | null
          module?: string | null
          order?: number | null
          subject_template?: string | null
          trigger_event?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_overrides: Json
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          digest_time: string | null
          email_urgent: boolean
          id: string
          mention_push: boolean | null
          mutes: Json
          preset: string | null
          quiet_hours: Json | null
          sms_phone: string | null
          sms_urgent: boolean
          updated_date: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          channel_overrides?: Json
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          digest_time?: string | null
          email_urgent?: boolean
          id?: string
          mention_push?: boolean | null
          mutes?: Json
          preset?: string | null
          quiet_hours?: Json | null
          sms_phone?: string | null
          sms_urgent?: boolean
          updated_date?: string
          user_email?: string | null
          user_id?: string
        }
        Update: {
          channel_overrides?: Json
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          digest_time?: string | null
          email_urgent?: boolean
          id?: string
          mention_push?: boolean | null
          mutes?: Json
          preset?: string | null
          quiet_hours?: Json | null
          sms_phone?: string | null
          sms_urgent?: boolean
          updated_date?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel_id: string | null
          channel_name: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          delivery: string | null
          expense_id: string | null
          id: string
          is_priority: boolean
          is_sample: boolean | null
          link: string | null
          message: string | null
          program_id: string | null
          read: boolean | null
          task_id: string | null
          title: string | null
          type: string | null
          updated_date: string
          user_email: string | null
        }
        Insert: {
          channel_id?: string | null
          channel_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          delivery?: string | null
          expense_id?: string | null
          id?: string
          is_priority?: boolean
          is_sample?: boolean | null
          link?: string | null
          message?: string | null
          program_id?: string | null
          read?: boolean | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          updated_date?: string
          user_email?: string | null
        }
        Update: {
          channel_id?: string | null
          channel_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          delivery?: string | null
          expense_id?: string | null
          id?: string
          is_priority?: boolean
          is_sample?: boolean | null
          link?: string | null
          message?: string | null
          program_id?: string | null
          read?: boolean | null
          task_id?: string | null
          title?: string | null
          type?: string | null
          updated_date?: string
          user_email?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          access: string | null
          club_id: string
          config: Json
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_sample: boolean | null
          name: string
          sort_order: number | null
          status: string
          type: string
          updated_date: string
        }
        Insert: {
          access?: string | null
          club_id: string
          config?: Json
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_sample?: boolean | null
          name: string
          sort_order?: number | null
          status?: string
          type?: string
          updated_date?: string
        }
        Update: {
          access?: string | null
          club_id?: string
          config?: Json
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_sample?: boolean | null
          name?: string
          sort_order?: number | null
          status?: string
          type?: string
          updated_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_processors: {
        Row: {
          account_label: string | null
          club_id: string | null
          connected_by: string | null
          connected_date: string | null
          connection_status: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          display_name: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_sample: boolean | null
          last_tested_date: string | null
          location_id: string | null
          notes: string | null
          processor_type: string | null
          publishable_key: string | null
          secret_key: string | null
          updated_date: string
          webhook_secret: string | null
        }
        Insert: {
          account_label?: string | null
          club_id?: string | null
          connected_by?: string | null
          connected_date?: string | null
          connection_status?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          display_name?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_sample?: boolean | null
          last_tested_date?: string | null
          location_id?: string | null
          notes?: string | null
          processor_type?: string | null
          publishable_key?: string | null
          secret_key?: string | null
          updated_date?: string
          webhook_secret?: string | null
        }
        Update: {
          account_label?: string | null
          club_id?: string | null
          connected_by?: string | null
          connected_date?: string | null
          connection_status?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          display_name?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_sample?: boolean | null
          last_tested_date?: string | null
          location_id?: string | null
          notes?: string | null
          processor_type?: string | null
          publishable_key?: string | null
          secret_key?: string | null
          updated_date?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_resolutions: {
        Row: {
          account_key: string
          aging_bucket: string | null
          amount_outstanding: number
          assigned_name: string | null
          assigned_to: string | null
          branch_name: string | null
          club_id: string
          contact_attempts: number
          created_by: string | null
          created_by_id: string | null
          created_date: string
          days_overdue: number
          due_date: string | null
          family_email: string | null
          guardian_name: string | null
          id: string
          is_sample: boolean | null
          last_contact_channel: string | null
          last_contacted_at: string | null
          last_late_payment_date: string | null
          last_reminder_at: string | null
          last_synced_at: string | null
          late_payment_count: number
          late_payment_ids: Json
          next_follow_up: string | null
          plan_amount: number | null
          plan_first_due: string | null
          plan_installments: number | null
          player_id: string | null
          player_name: string | null
          priority: string | null
          reminder_count: number
          resolution_note: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_id: string | null
          source_label: string | null
          source_type: string | null
          status: string
          team_name: string | null
          timeline: Json
          updated_date: string
        }
        Insert: {
          account_key: string
          aging_bucket?: string | null
          amount_outstanding?: number
          assigned_name?: string | null
          assigned_to?: string | null
          branch_name?: string | null
          club_id: string
          contact_attempts?: number
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          days_overdue?: number
          due_date?: string | null
          family_email?: string | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_contact_channel?: string | null
          last_contacted_at?: string | null
          last_late_payment_date?: string | null
          last_reminder_at?: string | null
          last_synced_at?: string | null
          late_payment_count?: number
          late_payment_ids?: Json
          next_follow_up?: string | null
          plan_amount?: number | null
          plan_first_due?: string | null
          plan_installments?: number | null
          player_id?: string | null
          player_name?: string | null
          priority?: string | null
          reminder_count?: number
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string
          team_name?: string | null
          timeline?: Json
          updated_date?: string
        }
        Update: {
          account_key?: string
          aging_bucket?: string | null
          amount_outstanding?: number
          assigned_name?: string | null
          assigned_to?: string | null
          branch_name?: string | null
          club_id?: string
          contact_attempts?: number
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          days_overdue?: number
          due_date?: string | null
          family_email?: string | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_contact_channel?: string | null
          last_contacted_at?: string | null
          last_late_payment_date?: string | null
          last_reminder_at?: string | null
          last_synced_at?: string | null
          late_payment_count?: number
          late_payment_ids?: Json
          next_follow_up?: string | null
          plan_amount?: number | null
          plan_first_due?: string | null
          plan_installments?: number | null
          player_id?: string | null
          player_name?: string | null
          priority?: string | null
          reminder_count?: number
          resolution_note?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string
          team_name?: string | null
          timeline?: Json
          updated_date?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          branch_id: string | null
          branch_name: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string | null
          due_date: string | null
          family_email: string | null
          guardian_name: string | null
          id: string
          invoice_number: string | null
          is_refund: boolean
          is_sample: boolean | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          player_id: string | null
          player_name: string | null
          processor_id: string | null
          processor_name: string | null
          recorded_by: string | null
          source_id: string | null
          source_label: string | null
          source_type: string | null
          status: string | null
          team_id: string | null
          team_name: string | null
          transaction_reference: string | null
          updated_date: string
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          branch_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          due_date?: string | null
          family_email?: string | null
          guardian_name?: string | null
          id?: string
          invoice_number?: string | null
          is_refund?: boolean
          is_sample?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          player_id?: string | null
          player_name?: string | null
          processor_id?: string | null
          processor_name?: string | null
          recorded_by?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          transaction_reference?: string | null
          updated_date?: string
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          branch_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          due_date?: string | null
          family_email?: string | null
          guardian_name?: string | null
          id?: string
          invoice_number?: string | null
          is_refund?: boolean
          is_sample?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          player_id?: string | null
          player_name?: string | null
          processor_id?: string | null
          processor_name?: string | null
          recorded_by?: string | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          transaction_reference?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      physical_assessments: {
        Row: {
          agility: number | null
          agility_5_10_5_seconds: number | null
          assessed_by: string | null
          assessment_date: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          endurance: number | null
          id: string
          is_sample: boolean | null
          lean: number | null
          notes: string | null
          overall: number | null
          player_id: string | null
          player_name: string | null
          power: number | null
          recovery: number | null
          speed: number | null
          sprint_20m_seconds: number | null
          updated_date: string
          vertical_jump_inches: number | null
          yoyo_level: number | null
        }
        Insert: {
          agility?: number | null
          agility_5_10_5_seconds?: number | null
          assessed_by?: string | null
          assessment_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          endurance?: number | null
          id?: string
          is_sample?: boolean | null
          lean?: number | null
          notes?: string | null
          overall?: number | null
          player_id?: string | null
          player_name?: string | null
          power?: number | null
          recovery?: number | null
          speed?: number | null
          sprint_20m_seconds?: number | null
          updated_date?: string
          vertical_jump_inches?: number | null
          yoyo_level?: number | null
        }
        Update: {
          agility?: number | null
          agility_5_10_5_seconds?: number | null
          assessed_by?: string | null
          assessment_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          endurance?: number | null
          id?: string
          is_sample?: boolean | null
          lean?: number | null
          notes?: string | null
          overall?: number | null
          player_id?: string | null
          player_name?: string | null
          power?: number | null
          recovery?: number | null
          speed?: number | null
          sprint_20m_seconds?: number | null
          updated_date?: string
          vertical_jump_inches?: number | null
          yoyo_level?: number | null
        }
        Relationships: []
      }
      platform_accesses: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          granted_by: string | null
          granted_date: string | null
          id: string
          is_sample: boolean | null
          platform_id: string | null
          platform_name: string | null
          updated_date: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          granted_by?: string | null
          granted_date?: string | null
          id?: string
          is_sample?: boolean | null
          platform_id?: string | null
          platform_name?: string | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          granted_by?: string | null
          granted_date?: string | null
          id?: string
          is_sample?: boolean | null
          platform_id?: string | null
          platform_name?: string | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      platform_payment_settings: {
        Row: {
          id: boolean
          preferred_provider: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          preferred_provider?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          preferred_provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      platforms: {
        Row: {
          created_by: string | null
          created_by_id: string | null
          created_date: string
          gender: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          name: string | null
          notes: string | null
          updated_date: string
        }
        Insert: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          updated_date?: string
        }
        Update: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      player_coach_reviews: {
        Row: {
          club_id: string
          coach_user_id: string
          created_at: string
          id: string
          player_id: string
          rationale: string
          recommendation: string
          season: string
          updated_at: string
        }
        Insert: {
          club_id: string
          coach_user_id?: string
          created_at?: string
          id?: string
          player_id: string
          rationale?: string
          recommendation: string
          season: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          coach_user_id?: string
          created_at?: string
          id?: string
          player_id?: string
          rationale?: string
          recommendation?: string
          season?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_coach_reviews_club_id_player_id_season_fkey"
            columns: ["club_id", "player_id", "season"]
            isOneToOne: false
            referencedRelation: "player_season_reviews"
            referencedColumns: ["club_id", "player_id", "season"]
          },
        ]
      }
      player_evaluations: {
        Row: {
          areas_of_growth: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          evaluation_date: string | null
          evaluator_email: string | null
          id: string
          is_sample: boolean | null
          mental_scores: Json | null
          overall_score: number | null
          physical_score: number | null
          player_id: string | null
          player_name: string | null
          preferred_foot: string | null
          primary_position: string | null
          status: string | null
          strengths: string | null
          tactical_scores: Json | null
          technical_scores: Json | null
          training_focus: string | null
          updated_date: string
        }
        Insert: {
          areas_of_growth?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          evaluation_date?: string | null
          evaluator_email?: string | null
          id?: string
          is_sample?: boolean | null
          mental_scores?: Json | null
          overall_score?: number | null
          physical_score?: number | null
          player_id?: string | null
          player_name?: string | null
          preferred_foot?: string | null
          primary_position?: string | null
          status?: string | null
          strengths?: string | null
          tactical_scores?: Json | null
          technical_scores?: Json | null
          training_focus?: string | null
          updated_date?: string
        }
        Update: {
          areas_of_growth?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          evaluation_date?: string | null
          evaluator_email?: string | null
          id?: string
          is_sample?: boolean | null
          mental_scores?: Json | null
          overall_score?: number | null
          physical_score?: number | null
          player_id?: string | null
          player_name?: string | null
          preferred_foot?: string | null
          primary_position?: string | null
          status?: string | null
          strengths?: string | null
          tactical_scores?: Json | null
          technical_scores?: Json | null
          training_focus?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      player_feedbacks: {
        Row: {
          approved_by: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          development_priorities: Json | null
          feedback_text: string | null
          goal_accepted: boolean | null
          id: string
          is_sample: boolean | null
          note_id: string | null
          player_id: string | null
          player_name: string | null
          recommended_videos: Json | null
          sent_at: string | null
          status: string | null
          strengths: Json | null
          suggested_goal_description: string | null
          suggested_goal_target: string | null
          tone: string | null
          updated_date: string
        }
        Insert: {
          approved_by?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          development_priorities?: Json | null
          feedback_text?: string | null
          goal_accepted?: boolean | null
          id?: string
          is_sample?: boolean | null
          note_id?: string | null
          player_id?: string | null
          player_name?: string | null
          recommended_videos?: Json | null
          sent_at?: string | null
          status?: string | null
          strengths?: Json | null
          suggested_goal_description?: string | null
          suggested_goal_target?: string | null
          tone?: string | null
          updated_date?: string
        }
        Update: {
          approved_by?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          development_priorities?: Json | null
          feedback_text?: string | null
          goal_accepted?: boolean | null
          id?: string
          is_sample?: boolean | null
          note_id?: string | null
          player_id?: string | null
          player_name?: string | null
          recommended_videos?: Json | null
          sent_at?: string | null
          status?: string | null
          strengths?: Json | null
          suggested_goal_description?: string | null
          suggested_goal_target?: string | null
          tone?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      player_notes: {
        Row: {
          author_email: string | null
          author_name: string | null
          club_id: string | null
          context: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          linked_event_id: string | null
          note_text: string | null
          player_id: string | null
          player_name: string | null
          tags: Json | null
          updated_date: string
          visibility: string | null
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          club_id?: string | null
          context?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          linked_event_id?: string | null
          note_text?: string | null
          player_id?: string | null
          player_name?: string | null
          tags?: Json | null
          updated_date?: string
          visibility?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          club_id?: string | null
          context?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          linked_event_id?: string | null
          note_text?: string | null
          player_id?: string | null
          player_name?: string | null
          tags?: Json | null
          updated_date?: string
          visibility?: string | null
        }
        Relationships: []
      }
      player_review_staff: {
        Row: {
          club_id: string
          coach_email: string
          created_at: string
        }
        Insert: {
          club_id: string
          coach_email: string
          created_at?: string
        }
        Update: {
          club_id?: string
          coach_email?: string
          created_at?: string
        }
        Relationships: []
      }
      player_season_reviews: {
        Row: {
          club_id: string
          created_at: string
          follow_up_notes: string
          follow_up_status: string
          id: string
          intent: string
          needs_follow_up: boolean
          player_id: string
          season: string
          team_role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          follow_up_notes?: string
          follow_up_status?: string
          id?: string
          intent?: string
          needs_follow_up?: boolean
          player_id: string
          season: string
          team_role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          follow_up_notes?: string
          follow_up_status?: string
          id?: string
          intent?: string
          needs_follow_up?: boolean
          player_id?: string
          season?: string
          team_role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          age_group: string | null
          club_id: string | null
          coach_id: string | null
          coach_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          guardian_id: string | null
          guardian_ids: Json | null
          guardian_name: string | null
          id: string
          is_sample: boolean | null
          jersey_number: string | null
          last_name: string | null
          league: string | null
          location_id: string | null
          location_name: string | null
          medical_notes: string | null
          notes: string | null
          photo_url: string | null
          position: string | null
          program_id: string | null
          program_title: string | null
          season: string | null
          status: string | null
          team_id: string | null
          team_name: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          club_id?: string | null
          coach_id?: string | null
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          guardian_id?: string | null
          guardian_ids?: Json | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          jersey_number?: string | null
          last_name?: string | null
          league?: string | null
          location_id?: string | null
          location_name?: string | null
          medical_notes?: string | null
          notes?: string | null
          photo_url?: string | null
          position?: string | null
          program_id?: string | null
          program_title?: string | null
          season?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string | null
          coach_id?: string | null
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          guardian_id?: string | null
          guardian_ids?: Json | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          jersey_number?: string | null
          last_name?: string | null
          league?: string | null
          location_id?: string | null
          location_name?: string | null
          medical_notes?: string | null
          notes?: string | null
          photo_url?: string | null
          position?: string | null
          program_id?: string | null
          program_title?: string | null
          season?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      plugins: {
        Row: {
          activated_by: string | null
          activated_date: string | null
          category: string | null
          color: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          key: string | null
          menu_items: Json | null
          modules: Json | null
          name: string | null
          order: number | null
          updated_date: string
        }
        Insert: {
          activated_by?: string | null
          activated_date?: string | null
          category?: string | null
          color?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          key?: string | null
          menu_items?: Json | null
          modules?: Json | null
          name?: string | null
          order?: number | null
          updated_date?: string
        }
        Update: {
          activated_by?: string | null
          activated_date?: string | null
          category?: string | null
          color?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          key?: string | null
          menu_items?: Json | null
          modules?: Json | null
          name?: string | null
          order?: number | null
          updated_date?: string
        }
        Relationships: []
      }
      pricing_configs: {
        Row: {
          base_license_fee: number | null
          base_players_included: number | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          founding_club_total: number
          id: string
          is_sample: boolean | null
          modules: Json | null
          setup_fee_additional_branch: number | null
          setup_fee_first_branch: number | null
          tiers: Json | null
          updated_date: string
          volume_multipliers: Json | null
        }
        Insert: {
          base_license_fee?: number | null
          base_players_included?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          founding_club_total?: number
          id?: string
          is_sample?: boolean | null
          modules?: Json | null
          setup_fee_additional_branch?: number | null
          setup_fee_first_branch?: number | null
          tiers?: Json | null
          updated_date?: string
          volume_multipliers?: Json | null
        }
        Update: {
          base_license_fee?: number | null
          base_players_included?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          founding_club_total?: number
          id?: string
          is_sample?: boolean | null
          modules?: Json | null
          setup_fee_additional_branch?: number | null
          setup_fee_first_branch?: number | null
          tiers?: Json | null
          updated_date?: string
          volume_multipliers?: Json | null
        }
        Relationships: []
      }
      priority_audit_logs: {
        Row: {
          audience_size: number | null
          channel_id: string | null
          channel_name: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          message_id: string | null
          sender_email: string | null
          sender_name: string | null
          sender_user_id: string | null
          updated_date: string
          urgency: string | null
        }
        Insert: {
          audience_size?: number | null
          channel_id?: string | null
          channel_name?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          message_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          updated_date?: string
          urgency?: string | null
        }
        Update: {
          audience_size?: number | null
          channel_id?: string | null
          channel_name?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          message_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          updated_date?: string
          urgency?: string | null
        }
        Relationships: []
      }
      program_feedbacks: {
        Row: {
          club_id: string | null
          comment: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          feedback_type: string | null
          id: string
          is_anonymous: boolean | null
          is_sample: boolean | null
          program_id: string | null
          rating: number | null
          updated_date: string
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          club_id?: string | null
          comment?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          feedback_type?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          rating?: number | null
          updated_date?: string
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          club_id?: string | null
          comment?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          feedback_type?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          rating?: number | null
          updated_date?: string
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      program_templates: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          default_branches: Json | null
          default_category: string | null
          default_duration_days: number | null
          default_gender_eligibility: string | null
          default_priority: string | null
          default_season: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          name: string | null
          predefined_tasks: Json | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          default_branches?: Json | null
          default_category?: string | null
          default_duration_days?: number | null
          default_gender_eligibility?: string | null
          default_priority?: string | null
          default_season?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          predefined_tasks?: Json | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          default_branches?: Json | null
          default_category?: string | null
          default_duration_days?: number | null
          default_gender_eligibility?: string | null
          default_priority?: string | null
          default_season?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          predefined_tasks?: Json | null
          updated_date?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          accountable: Json | null
          age_eligibility: string | null
          assignee: string | null
          branches: Json | null
          budget: number | null
          budget_approval: string | null
          category: string | null
          club_id: string | null
          completed_date: string | null
          consulted: Json | null
          cost_by_player: Json | null
          created_by: string | null
          created_by_email: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          due_date: string | null
          facility_id: string | null
          facility_name: string | null
          field_location: string | null
          field_number: string | null
          gender_eligibility: string | null
          id: string
          informed: Json | null
          is_sample: boolean | null
          location_id: string | null
          location_name: string | null
          order: number | null
          priority: string | null
          program_dates: string | null
          program_time: string | null
          responsible: Json | null
          revenue_by_player: Json | null
          roadmap_project_id: string | null
          roadmap_task_id: string | null
          season: string | null
          started_date: string | null
          status: string | null
          suggested_start_date: string | null
          title: string | null
          unique_id: string | null
          updated_date: string
          workstream: string | null
          year: string | null
        }
        Insert: {
          accountable?: Json | null
          age_eligibility?: string | null
          assignee?: string | null
          branches?: Json | null
          budget?: number | null
          budget_approval?: string | null
          category?: string | null
          club_id?: string | null
          completed_date?: string | null
          consulted?: Json | null
          cost_by_player?: Json | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          due_date?: string | null
          facility_id?: string | null
          facility_name?: string | null
          field_location?: string | null
          field_number?: string | null
          gender_eligibility?: string | null
          id?: string
          informed?: Json | null
          is_sample?: boolean | null
          location_id?: string | null
          location_name?: string | null
          order?: number | null
          priority?: string | null
          program_dates?: string | null
          program_time?: string | null
          responsible?: Json | null
          revenue_by_player?: Json | null
          roadmap_project_id?: string | null
          roadmap_task_id?: string | null
          season?: string | null
          started_date?: string | null
          status?: string | null
          suggested_start_date?: string | null
          title?: string | null
          unique_id?: string | null
          updated_date?: string
          workstream?: string | null
          year?: string | null
        }
        Update: {
          accountable?: Json | null
          age_eligibility?: string | null
          assignee?: string | null
          branches?: Json | null
          budget?: number | null
          budget_approval?: string | null
          category?: string | null
          club_id?: string | null
          completed_date?: string | null
          consulted?: Json | null
          cost_by_player?: Json | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          due_date?: string | null
          facility_id?: string | null
          facility_name?: string | null
          field_location?: string | null
          field_number?: string | null
          gender_eligibility?: string | null
          id?: string
          informed?: Json | null
          is_sample?: boolean | null
          location_id?: string | null
          location_name?: string | null
          order?: number | null
          priority?: string | null
          program_dates?: string | null
          program_time?: string | null
          responsible?: Json | null
          revenue_by_player?: Json | null
          roadmap_project_id?: string | null
          roadmap_task_id?: string | null
          season?: string | null
          started_date?: string | null
          status?: string | null
          suggested_start_date?: string | null
          title?: string | null
          unique_id?: string | null
          updated_date?: string
          workstream?: string | null
          year?: string | null
        }
        Relationships: []
      }
      rbacconfigs: {
        Row: {
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          is_sample: boolean | null
          permissions: Json | null
          role: string | null
          role_label: string | null
          updated_date: string
        }
        Insert: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_sample?: boolean | null
          permissions?: Json | null
          role?: string | null
          role_label?: string | null
          updated_date?: string
        }
        Update: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_sample?: boolean | null
          permissions?: Json | null
          role?: string | null
          role_label?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      referees: {
        Row: {
          certification_level: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string | null
          email: string | null
          first_name: string | null
          id: string
          is_sample: boolean | null
          last_name: string | null
          phone: string | null
          status: string | null
          updated_date: string | null
        }
        Insert: {
          certification_level?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_name?: string | null
          phone?: string | null
          status?: string | null
          updated_date?: string | null
        }
        Update: {
          certification_level?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_sample?: boolean | null
          last_name?: string | null
          phone?: string | null
          status?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          assigned_to: string | null
          club_id: string | null
          completed_documents: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          financial_aid_requested: boolean | null
          guardian_id: string | null
          guardian_name: string | null
          id: string
          is_sample: boolean | null
          kanban_task_id: string | null
          location_id: string | null
          location_name: string | null
          next_payment_amount: number | null
          next_payment_date: string | null
          notes: string | null
          offer_id: string | null
          paperwork_complete: boolean | null
          payment_frequency: string | null
          payment_plan_notes: string | null
          payment_status: string | null
          player_id: string | null
          player_name: string | null
          program_id: string | null
          program_title: string | null
          registration_date: string | null
          required_documents: Json | null
          status: string | null
          team_id: string | null
          team_name: string | null
          unique_id: string | null
          updated_date: string
          waiver_accepted: boolean | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          assigned_to?: string | null
          club_id?: string | null
          completed_documents?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          financial_aid_requested?: boolean | null
          guardian_id?: string | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          kanban_task_id?: string | null
          location_id?: string | null
          location_name?: string | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          offer_id?: string | null
          paperwork_complete?: boolean | null
          payment_frequency?: string | null
          payment_plan_notes?: string | null
          payment_status?: string | null
          player_id?: string | null
          player_name?: string | null
          program_id?: string | null
          program_title?: string | null
          registration_date?: string | null
          required_documents?: Json | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
          waiver_accepted?: boolean | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          assigned_to?: string | null
          club_id?: string | null
          completed_documents?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          financial_aid_requested?: boolean | null
          guardian_id?: string | null
          guardian_name?: string | null
          id?: string
          is_sample?: boolean | null
          kanban_task_id?: string | null
          location_id?: string | null
          location_name?: string | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          notes?: string | null
          offer_id?: string | null
          paperwork_complete?: boolean | null
          payment_frequency?: string | null
          payment_plan_notes?: string | null
          payment_status?: string | null
          player_id?: string | null
          player_name?: string | null
          program_id?: string | null
          program_title?: string | null
          registration_date?: string | null
          required_documents?: Json | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          unique_id?: string | null
          updated_date?: string
          waiver_accepted?: boolean | null
        }
        Relationships: []
      }
      roadmap_projects: {
        Row: {
          activated_by: string | null
          activated_date: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          number: string | null
          order: number | null
          title: string | null
          updated_date: string
        }
        Insert: {
          activated_by?: string | null
          activated_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          number?: string | null
          order?: number | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          activated_by?: string | null
          activated_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          number?: string | null
          order?: number | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      roadmap_tasks: {
        Row: {
          accountable: Json | null
          activated_by: string | null
          activated_date: string | null
          assigned_to: string | null
          budget: number | null
          club_id: string | null
          completed_by: string | null
          completed_date: string | null
          consulted: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          fulfillment_notes: string | null
          id: string
          informed: Json | null
          is_active: boolean | null
          is_sample: boolean | null
          kanban_program_id: string | null
          linked_module: string | null
          order: number | null
          payment_status: string | null
          project_id: string | null
          project_number: string | null
          project_title: string | null
          responsible: Json | null
          status: string | null
          task_number: string | null
          title: string | null
          updated_date: string
        }
        Insert: {
          accountable?: Json | null
          activated_by?: string | null
          activated_date?: string | null
          assigned_to?: string | null
          budget?: number | null
          club_id?: string | null
          completed_by?: string | null
          completed_date?: string | null
          consulted?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          fulfillment_notes?: string | null
          id?: string
          informed?: Json | null
          is_active?: boolean | null
          is_sample?: boolean | null
          kanban_program_id?: string | null
          linked_module?: string | null
          order?: number | null
          payment_status?: string | null
          project_id?: string | null
          project_number?: string | null
          project_title?: string | null
          responsible?: Json | null
          status?: string | null
          task_number?: string | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          accountable?: Json | null
          activated_by?: string | null
          activated_date?: string | null
          assigned_to?: string | null
          budget?: number | null
          club_id?: string | null
          completed_by?: string | null
          completed_date?: string | null
          consulted?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          fulfillment_notes?: string | null
          id?: string
          informed?: Json | null
          is_active?: boolean | null
          is_sample?: boolean | null
          kanban_program_id?: string | null
          linked_module?: string | null
          order?: number | null
          payment_status?: string | null
          project_id?: string | null
          project_number?: string | null
          project_title?: string | null
          responsible?: Json | null
          status?: string | null
          task_number?: string | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          frequency: string | null
          id: string
          include_budget: boolean | null
          include_expenses: boolean | null
          include_programs: boolean | null
          include_tasks: boolean | null
          is_active: boolean | null
          is_sample: boolean | null
          last_sent: string | null
          name: string | null
          recipients: Json | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          frequency?: string | null
          id?: string
          include_budget?: boolean | null
          include_expenses?: boolean | null
          include_programs?: boolean | null
          include_tasks?: boolean | null
          is_active?: boolean | null
          is_sample?: boolean | null
          last_sent?: string | null
          name?: string | null
          recipients?: Json | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          frequency?: string | null
          id?: string
          include_budget?: boolean | null
          include_expenses?: boolean | null
          include_programs?: boolean | null
          include_tasks?: boolean | null
          is_active?: boolean | null
          is_sample?: boolean | null
          last_sent?: string | null
          name?: string | null
          recipients?: Json | null
          updated_date?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          end_date: string | null
          id: string
          is_current: boolean | null
          is_sample: boolean | null
          name: string | null
          notes: string | null
          rolled_over_from_season_id: string | null
          start_date: string | null
          status: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          rolled_over_from_season_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_sample?: boolean | null
          name?: string | null
          notes?: string | null
          rolled_over_from_season_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      skill_test_scores: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          level: string | null
          logged_by: string | null
          notes: string | null
          player_id: string | null
          player_name: string | null
          score: number | null
          test_date: string | null
          test_id: string | null
          test_title: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          level?: string | null
          logged_by?: string | null
          notes?: string | null
          player_id?: string | null
          player_name?: string | null
          score?: number | null
          test_date?: string | null
          test_id?: string | null
          test_title?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          level?: string | null
          logged_by?: string | null
          notes?: string | null
          player_id?: string | null
          player_name?: string | null
          score?: number | null
          test_date?: string | null
          test_id?: string | null
          test_title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      skill_tests: {
        Row: {
          category: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          diagram_notes: string | null
          duration_minutes: number | null
          how_to_perform: string | null
          id: string
          is_sample: boolean | null
          order: number | null
          player_count: number | null
          scoring: string | null
          setup: string | null
          title: string | null
          updated_date: string
        }
        Insert: {
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          diagram_notes?: string | null
          duration_minutes?: number | null
          how_to_perform?: string | null
          id?: string
          is_sample?: boolean | null
          order?: number | null
          player_count?: number | null
          scoring?: string | null
          setup?: string | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          diagram_notes?: string | null
          duration_minutes?: number | null
          how_to_perform?: string | null
          id?: string
          is_sample?: boolean | null
          order?: number | null
          player_count?: number | null
          scoring?: string | null
          setup?: string | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      spells: {
        Row: {
          casting_time: string | null
          classes: Json | null
          components: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          duration: string | null
          id: string
          is_sample: boolean | null
          level: number | null
          name: string | null
          range: string | null
          school: string | null
          updated_date: string
        }
        Insert: {
          casting_time?: string | null
          classes?: Json | null
          components?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_sample?: boolean | null
          level?: number | null
          name?: string | null
          range?: string | null
          school?: string | null
          updated_date?: string
        }
        Update: {
          casting_time?: string | null
          classes?: Json | null
          components?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_sample?: boolean | null
          level?: number | null
          name?: string | null
          range?: string | null
          school?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      staff_pays: {
        Row: {
          amount: number | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          date: string | null
          hours_worked: number | null
          id: string
          is_sample: boolean | null
          notes: string | null
          payment_status: string | null
          payor_email: string | null
          payor_name: string | null
          program_id: string | null
          role: string | null
          staff_email: string | null
          staff_name: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          amount?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          hours_worked?: number | null
          id?: string
          is_sample?: boolean | null
          notes?: string | null
          payment_status?: string | null
          payor_email?: string | null
          payor_name?: string | null
          program_id?: string | null
          role?: string | null
          staff_email?: string | null
          staff_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          amount?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          hours_worked?: number | null
          id?: string
          is_sample?: boolean | null
          notes?: string | null
          payment_status?: string | null
          payor_email?: string | null
          payor_name?: string | null
          program_id?: string | null
          role?: string | null
          staff_email?: string | null
          staff_name?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      standings: {
        Row: {
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string | null
          drawn: number | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          group_name: string | null
          id: string
          is_sample: boolean | null
          lost: number | null
          played: number | null
          points: number | null
          position: number | null
          team_name: string | null
          tournament_id: string | null
          updated_date: string | null
          won: number | null
        }
        Insert: {
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          drawn?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          id?: string
          is_sample?: boolean | null
          lost?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          team_name?: string | null
          tournament_id?: string | null
          updated_date?: string | null
          won?: number | null
        }
        Update: {
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          drawn?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          id?: string
          is_sample?: boolean | null
          lost?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          team_name?: string | null
          tournament_id?: string | null
          updated_date?: string | null
          won?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_sample: boolean | null
          max_branches: number | null
          max_players: number | null
          max_teams: number | null
          modules: Json | null
          name: string | null
          price_annually: number | null
          price_monthly: number | null
          sort_order: number | null
          tier: string | null
          updated_date: string
        }
        Insert: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          max_branches?: number | null
          max_players?: number | null
          max_teams?: number | null
          modules?: Json | null
          name?: string | null
          price_annually?: number | null
          price_monthly?: number | null
          sort_order?: number | null
          tier?: string | null
          updated_date?: string
        }
        Update: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_sample?: boolean | null
          max_branches?: number | null
          max_players?: number | null
          max_teams?: number | null
          modules?: Json | null
          name?: string | null
          price_annually?: number | null
          price_monthly?: number | null
          sort_order?: number | null
          tier?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          actual_hours: number | null
          assignee: string | null
          category: string | null
          club_id: string | null
          completed: boolean | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          dependencies: Json | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_recurring: boolean | null
          is_sample: boolean | null
          priority: string | null
          program_id: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          status: string | null
          task_id: string | null
          title: string | null
          updated_date: string
        }
        Insert: {
          actual_hours?: number | null
          assignee?: string | null
          category?: string | null
          club_id?: string | null
          completed?: boolean | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          dependencies?: Json | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          is_sample?: boolean | null
          priority?: string | null
          program_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          status?: string | null
          task_id?: string | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          actual_hours?: number | null
          assignee?: string | null
          category?: string | null
          club_id?: string | null
          completed?: boolean | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          dependencies?: Json | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          is_sample?: boolean | null
          priority?: string | null
          program_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          status?: string | null
          task_id?: string | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          club_id: string | null
          club_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          id: string
          is_sample: boolean | null
          priority: string | null
          resolution_notes: string | null
          resolved_by: string | null
          resolved_date: string | null
          status: string | null
          subject: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          updated_date: string
        }
        Insert: {
          category?: string | null
          club_id?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_sample?: boolean | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string | null
          subject?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          updated_date?: string
        }
        Update: {
          category?: string | null
          club_id?: string | null
          club_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          id?: string
          is_sample?: boolean | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string | null
          subject?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      system_owner_grants: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          accountable: Json | null
          assignee: string | null
          category: string | null
          club_id: string | null
          completed: boolean | null
          consulted: Json | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          dependencies: Json | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          informed: Json | null
          is_recurring: boolean | null
          is_sample: boolean | null
          program_id: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          requires_payment: boolean | null
          responsible: Json | null
          task_type: string | null
          title: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          accountable?: Json | null
          assignee?: string | null
          category?: string | null
          club_id?: string | null
          completed?: boolean | null
          consulted?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          dependencies?: Json | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          informed?: Json | null
          is_recurring?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          requires_payment?: boolean | null
          responsible?: Json | null
          task_type?: string | null
          title?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          accountable?: Json | null
          assignee?: string | null
          category?: string | null
          club_id?: string | null
          completed?: boolean | null
          consulted?: Json | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          dependencies?: Json | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          informed?: Json | null
          is_recurring?: boolean | null
          is_sample?: boolean | null
          program_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          requires_payment?: boolean | null
          responsible?: Json | null
          task_type?: string | null
          title?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      team_plans: {
        Row: {
          age_group: string | null
          branch_id: string | null
          branch_name: string | null
          club_dues: number
          club_id: string
          coach_id: string | null
          coach_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          fall_training: string | null
          gender: string | null
          id: string
          included_programs: Json
          included_services: Json
          installment_count: number | null
          is_sample: boolean | null
          is_template: boolean
          league_games: string | null
          notes: string | null
          offer_id: string | null
          payment_plans: Json
          platform_id: string | null
          platform_name: string | null
          playing_format: string | null
          season: string | null
          spring_training: string | null
          status: string
          team_fees: Json
          team_id: string | null
          team_name: string
          template_name: string | null
          tournament_count: number | null
          tournament_names: Json
          updated_date: string
          winter_training: string | null
        }
        Insert: {
          age_group?: string | null
          branch_id?: string | null
          branch_name?: string | null
          club_dues?: number
          club_id: string
          coach_id?: string | null
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          fall_training?: string | null
          gender?: string | null
          id?: string
          included_programs?: Json
          included_services?: Json
          installment_count?: number | null
          is_sample?: boolean | null
          is_template?: boolean
          league_games?: string | null
          notes?: string | null
          offer_id?: string | null
          payment_plans?: Json
          platform_id?: string | null
          platform_name?: string | null
          playing_format?: string | null
          season?: string | null
          spring_training?: string | null
          status?: string
          team_fees?: Json
          team_id?: string | null
          team_name: string
          template_name?: string | null
          tournament_count?: number | null
          tournament_names?: Json
          updated_date?: string
          winter_training?: string | null
        }
        Update: {
          age_group?: string | null
          branch_id?: string | null
          branch_name?: string | null
          club_dues?: number
          club_id?: string
          coach_id?: string | null
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          fall_training?: string | null
          gender?: string | null
          id?: string
          included_programs?: Json
          included_services?: Json
          installment_count?: number | null
          is_sample?: boolean | null
          is_template?: boolean
          league_games?: string | null
          notes?: string | null
          offer_id?: string | null
          payment_plans?: Json
          platform_id?: string | null
          platform_name?: string | null
          playing_format?: string | null
          season?: string | null
          spring_training?: string | null
          status?: string
          team_fees?: Json
          team_id?: string | null
          team_name?: string
          template_name?: string | null
          tournament_count?: number | null
          tournament_names?: Json
          updated_date?: string
          winter_training?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_plans_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          age_group: string | null
          club_id: string | null
          coach_id: string | null
          coach_ids: Json | null
          coach_name: string | null
          coach_names: Json | null
          cost: number | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          gender: string | null
          id: string
          is_sample: boolean | null
          league: string | null
          location_id: string | null
          location_name: string | null
          max_roster_size: number | null
          name: string | null
          next_season_coach_id: string | null
          next_season_coach_name: string | null
          notes: string | null
          platform_id: string | null
          platform_name: string | null
          player_ids: Json | null
          playing_format: string | null
          program_id: string | null
          program_title: string | null
          season: string | null
          team_manager_id: string | null
          team_manager_ids: Json | null
          team_manager_name: string | null
          team_manager_names: Json | null
          team_plans: string | null
          unique_id: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          club_id?: string | null
          coach_id?: string | null
          coach_ids?: Json | null
          coach_name?: string | null
          coach_names?: Json | null
          cost?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          league?: string | null
          location_id?: string | null
          location_name?: string | null
          max_roster_size?: number | null
          name?: string | null
          next_season_coach_id?: string | null
          next_season_coach_name?: string | null
          notes?: string | null
          platform_id?: string | null
          platform_name?: string | null
          player_ids?: Json | null
          playing_format?: string | null
          program_id?: string | null
          program_title?: string | null
          season?: string | null
          team_manager_id?: string | null
          team_manager_ids?: Json | null
          team_manager_name?: string | null
          team_manager_names?: Json | null
          team_plans?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string | null
          coach_id?: string | null
          coach_ids?: Json | null
          coach_name?: string | null
          coach_names?: Json | null
          cost?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          league?: string | null
          location_id?: string | null
          location_name?: string | null
          max_roster_size?: number | null
          name?: string | null
          next_season_coach_id?: string | null
          next_season_coach_name?: string | null
          notes?: string | null
          platform_id?: string | null
          platform_name?: string | null
          player_ids?: Json | null
          playing_format?: string | null
          program_id?: string | null
          program_title?: string | null
          season?: string | null
          team_manager_id?: string | null
          team_manager_ids?: Json | null
          team_manager_name?: string | null
          team_manager_names?: Json | null
          team_plans?: string | null
          unique_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          access_ends_at: string | null
          admin_enabled: boolean | null
          club_id: string
          complimentary_expires_at: string | null
          complimentary_granted_by: string | null
          complimentary_reason: string | null
          created_at: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          current_period_end: string | null
          current_period_start: string | null
          drift_detail: string | null
          drift_flagged: boolean
          grace_ends_at: string | null
          id: string
          is_sample: boolean | null
          last_synced_at: string | null
          module_key: string
          status: string
          stripe_item_id: string | null
          stripe_subscription_id: string | null
          subscription_id: string | null
          updated_at: string
          updated_date: string
        }
        Insert: {
          access_ends_at?: string | null
          admin_enabled?: boolean | null
          club_id: string
          complimentary_expires_at?: string | null
          complimentary_granted_by?: string | null
          complimentary_reason?: string | null
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          current_period_end?: string | null
          current_period_start?: string | null
          drift_detail?: string | null
          drift_flagged?: boolean
          grace_ends_at?: string | null
          id?: string
          is_sample?: boolean | null
          last_synced_at?: string | null
          module_key: string
          status?: string
          stripe_item_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          updated_date?: string
        }
        Update: {
          access_ends_at?: string | null
          admin_enabled?: boolean | null
          club_id?: string
          complimentary_expires_at?: string | null
          complimentary_granted_by?: string | null
          complimentary_reason?: string | null
          created_at?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          current_period_end?: string | null
          current_period_start?: string | null
          drift_detail?: string | null
          drift_flagged?: boolean
          grace_ends_at?: string | null
          id?: string
          is_sample?: boolean | null
          last_synced_at?: string | null
          module_key?: string
          status?: string
          stripe_item_id?: string | null
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          updated_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_benchmarks: {
        Row: {
          ai_formula_notes: string | null
          category: string | null
          club_id: string | null
          coefficient: number | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          direction: string | null
          gender: string | null
          id: string
          is_sample: boolean | null
          p100: number | null
          p20: number | null
          p40: number | null
          p60: number | null
          p80: number | null
          test_key: string | null
          test_label: string | null
          unit: string | null
          updated_by: string | null
          updated_date: string
        }
        Insert: {
          ai_formula_notes?: string | null
          category?: string | null
          club_id?: string | null
          coefficient?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          direction?: string | null
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          p100?: number | null
          p20?: number | null
          p40?: number | null
          p60?: number | null
          p80?: number | null
          test_key?: string | null
          test_label?: string | null
          unit?: string | null
          updated_by?: string | null
          updated_date?: string
        }
        Update: {
          ai_formula_notes?: string | null
          category?: string | null
          club_id?: string | null
          coefficient?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          direction?: string | null
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          p100?: number | null
          p20?: number | null
          p40?: number | null
          p60?: number | null
          p80?: number | null
          test_key?: string | null
          test_label?: string | null
          unit?: string | null
          updated_by?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          assessment_type: string | null
          calendar_event_id: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          duration_minutes: number | null
          id: string
          invited_coaches: Json | null
          is_sample: boolean | null
          location: string | null
          notes: string | null
          roster_player_ids: Json | null
          start_time: string | null
          status: string | null
          test_date: string | null
          title: string | null
          updated_date: string
        }
        Insert: {
          assessment_type?: string | null
          calendar_event_id?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          duration_minutes?: number | null
          id?: string
          invited_coaches?: Json | null
          is_sample?: boolean | null
          location?: string | null
          notes?: string | null
          roster_player_ids?: Json | null
          start_time?: string | null
          status?: string | null
          test_date?: string | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          assessment_type?: string | null
          calendar_event_id?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          duration_minutes?: number | null
          id?: string
          invited_coaches?: Json | null
          is_sample?: boolean | null
          location?: string | null
          notes?: string | null
          roster_player_ids?: Json | null
          start_time?: string | null
          status?: string | null
          test_date?: string | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          billable: boolean | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          date: string | null
          description: string | null
          hours: number | null
          id: string
          is_sample: boolean | null
          program_id: string | null
          status: string | null
          task_id: string | null
          updated_date: string
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          billable?: boolean | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          is_sample?: boolean | null
          program_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_date?: string
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          billable?: boolean | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          is_sample?: boolean | null
          program_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_date?: string
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          club_id: string
          coach_name: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string | null
          division: string | null
          id: string
          is_sample: boolean | null
          payment_status: string | null
          status: string | null
          team_city: string | null
          team_contact_email: string | null
          team_contact_name: string | null
          team_name: string | null
          team_state: string | null
          tournament_id: string | null
          updated_date: string | null
        }
        Insert: {
          club_id: string
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          division?: string | null
          id?: string
          is_sample?: boolean | null
          payment_status?: string | null
          status?: string | null
          team_city?: string | null
          team_contact_email?: string | null
          team_contact_name?: string | null
          team_name?: string | null
          team_state?: string | null
          tournament_id?: string | null
          updated_date?: string | null
        }
        Update: {
          club_id?: string
          coach_name?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          division?: string | null
          id?: string
          is_sample?: boolean | null
          payment_status?: string | null
          status?: string | null
          team_city?: string | null
          team_contact_email?: string | null
          team_contact_name?: string | null
          team_name?: string | null
          team_state?: string | null
          tournament_id?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          age_group: string | null
          club_id: string
          contact_email: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          format: string | null
          gender: string | null
          id: string
          is_public: boolean | null
          is_sample: boolean | null
          max_teams: number | null
          name: string | null
          registered_count: number | null
          rules: string | null
          sport: string | null
          start_date: string | null
          status: string | null
          updated_date: string | null
        }
        Insert: {
          age_group?: string | null
          club_id: string
          contact_email?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean | null
          is_sample?: boolean | null
          max_teams?: number | null
          name?: string | null
          registered_count?: number | null
          rules?: string | null
          sport?: string | null
          start_date?: string | null
          status?: string | null
          updated_date?: string | null
        }
        Update: {
          age_group?: string | null
          club_id?: string
          contact_email?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean | null
          is_sample?: boolean | null
          max_teams?: number | null
          name?: string | null
          registered_count?: number | null
          rules?: string | null
          sport?: string | null
          start_date?: string | null
          status?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_sample: boolean | null
          is_scheduled: boolean | null
          level: string | null
          objective: string | null
          order: number | null
          player_count: number | null
          position: string | null
          scheduled_date: string | null
          tenet: string | null
          title: string | null
          topic: string | null
          updated_date: string
        }
        Insert: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_sample?: boolean | null
          is_scheduled?: boolean | null
          level?: string | null
          objective?: string | null
          order?: number | null
          player_count?: number | null
          position?: string | null
          scheduled_date?: string | null
          tenet?: string | null
          title?: string | null
          topic?: string | null
          updated_date?: string
        }
        Update: {
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_sample?: boolean | null
          is_scheduled?: boolean | null
          level?: string | null
          objective?: string | null
          order?: number | null
          player_count?: number | null
          position?: string | null
          scheduled_date?: string | null
          tenet?: string | null
          title?: string | null
          topic?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          author: string | null
          category: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          description: string | null
          duration: string | null
          id: string
          is_sample: boolean | null
          level: string | null
          order: number | null
          tenet: string | null
          thumbnail_url: string | null
          title: string | null
          updated_date: string
          video_url: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_sample?: boolean | null
          level?: string | null
          order?: number | null
          tenet?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_date?: string
          video_url?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_sample?: boolean | null
          level?: string | null
          order?: number | null
          tenet?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_date?: string
          video_url?: string | null
        }
        Relationships: []
      }
      trial_signupses: {
        Row: {
          branch_count: string | null
          club_id: string | null
          club_name: string | null
          converted_date: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          email: string | null
          id: string
          invited_emails: Json | null
          is_sample: boolean | null
          signup_date: string | null
          sport: string | null
          status: string | null
          trial_end_date: string | null
          updated_date: string
          user_id: string | null
        }
        Insert: {
          branch_count?: string | null
          club_id?: string | null
          club_name?: string | null
          converted_date?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          id?: string
          invited_emails?: Json | null
          is_sample?: boolean | null
          signup_date?: string | null
          sport?: string | null
          status?: string | null
          trial_end_date?: string | null
          updated_date?: string
          user_id?: string | null
        }
        Update: {
          branch_count?: string | null
          club_id?: string | null
          club_name?: string | null
          converted_date?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          email?: string | null
          id?: string
          invited_emails?: Json | null
          is_sample?: boolean | null
          signup_date?: string | null
          sport?: string | null
          status?: string | null
          trial_end_date?: string | null
          updated_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tryout_evaluations: {
        Row: {
          age_group: string | null
          club_id: string
          created_by: string | null
          created_by_id: string | null
          created_date: string
          criteria_scores: Json
          evaluator_email: string
          evaluator_name: string | null
          evaluator_user_id: string | null
          guardian_email: string | null
          id: string
          is_sample: boolean | null
          notes: string | null
          overall_grade: number | null
          player_age: number | null
          player_bib: number | null
          player_gender: string | null
          player_id: string | null
          player_name: string
          player_photo_url: string | null
          recommendation: string
          saved_at: string | null
          season_name: string | null
          status: string
          tryout_event_id: string
          tryout_plan_id: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          club_id: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          criteria_scores?: Json
          evaluator_email: string
          evaluator_name?: string | null
          evaluator_user_id?: string | null
          guardian_email?: string | null
          id?: string
          is_sample?: boolean | null
          notes?: string | null
          overall_grade?: number | null
          player_age?: number | null
          player_bib?: number | null
          player_gender?: string | null
          player_id?: string | null
          player_name: string
          player_photo_url?: string | null
          recommendation?: string
          saved_at?: string | null
          season_name?: string | null
          status?: string
          tryout_event_id: string
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          criteria_scores?: Json
          evaluator_email?: string
          evaluator_name?: string | null
          evaluator_user_id?: string | null
          guardian_email?: string | null
          id?: string
          is_sample?: boolean | null
          notes?: string | null
          overall_grade?: number | null
          player_age?: number | null
          player_bib?: number | null
          player_gender?: string | null
          player_id?: string | null
          player_name?: string
          player_photo_url?: string | null
          recommendation?: string
          saved_at?: string | null
          season_name?: string | null
          status?: string
          tryout_event_id?: string
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_events: {
        Row: {
          accepted_count: number | null
          auto_registration: boolean | null
          checked_in_count: number | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          date: string | null
          end_time: string | null
          evaluated_count: number | null
          expected_attendance: number | null
          id: string
          is_anchor: boolean | null
          is_sample: boolean | null
          kanban_card_id: string | null
          location: string | null
          notes: string | null
          owner_name: string | null
          owner_user_id: string | null
          registration_count: number | null
          registration_url: string | null
          responsible_name: string | null
          responsible_user_id: string | null
          stage: string | null
          start_time: string | null
          supplemental_index: number | null
          tryout_plan_id: string | null
          type: string | null
          updated_date: string
        }
        Insert: {
          accepted_count?: number | null
          auto_registration?: boolean | null
          checked_in_count?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          end_time?: string | null
          evaluated_count?: number | null
          expected_attendance?: number | null
          id?: string
          is_anchor?: boolean | null
          is_sample?: boolean | null
          kanban_card_id?: string | null
          location?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          registration_count?: number | null
          registration_url?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          stage?: string | null
          start_time?: string | null
          supplemental_index?: number | null
          tryout_plan_id?: string | null
          type?: string | null
          updated_date?: string
        }
        Update: {
          accepted_count?: number | null
          auto_registration?: boolean | null
          checked_in_count?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          date?: string | null
          end_time?: string | null
          evaluated_count?: number | null
          expected_attendance?: number | null
          id?: string
          is_anchor?: boolean | null
          is_sample?: boolean | null
          kanban_card_id?: string | null
          location?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          registration_count?: number | null
          registration_url?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          stage?: string | null
          start_time?: string | null
          supplemental_index?: number | null
          tryout_plan_id?: string | null
          type?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_final_registrations: {
        Row: {
          amount_due: number | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          guardian_email: string | null
          guardian_id: string | null
          id: string
          invited_date: string | null
          is_sample: boolean | null
          payment_frequency: string | null
          player_id: string | null
          player_name: string | null
          status: string | null
          submitted_date: string | null
          team_id: string | null
          team_name: string | null
          tryout_plan_id: string | null
          updated_date: string
          waiver_accepted: boolean | null
        }
        Insert: {
          amount_due?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          guardian_email?: string | null
          guardian_id?: string | null
          id?: string
          invited_date?: string | null
          is_sample?: boolean | null
          payment_frequency?: string | null
          player_id?: string | null
          player_name?: string | null
          status?: string | null
          submitted_date?: string | null
          team_id?: string | null
          team_name?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
          waiver_accepted?: boolean | null
        }
        Update: {
          amount_due?: number | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          guardian_email?: string | null
          guardian_id?: string | null
          id?: string
          invited_date?: string | null
          is_sample?: boolean | null
          payment_frequency?: string | null
          player_id?: string | null
          player_name?: string | null
          status?: string | null
          submitted_date?: string | null
          team_id?: string | null
          team_name?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
          waiver_accepted?: boolean | null
        }
        Relationships: []
      }
      tryout_offers: {
        Row: {
          age_group: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          club_id: string
          combined_score: number | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          currency: string | null
          expires_at: string | null
          extended_count: number | null
          fee_amount: number | null
          fee_note: string | null
          final_registration_id: string | null
          guardian_email: string | null
          guardian_id: string | null
          guardian_name: string | null
          history: Json
          id: string
          invite_id: string | null
          is_sample: boolean | null
          list_type: string | null
          player_age: number | null
          player_bib: string | null
          player_gender: string | null
          player_id: string | null
          player_name: string | null
          player_photo_url: string | null
          proposed_at: string | null
          proposed_by_email: string | null
          proposed_by_name: string | null
          rank: number | null
          registration_id: string | null
          responded_at: string | null
          response_channel: string | null
          response_note: string | null
          sent_at: string | null
          status: string
          team_id: string | null
          team_name: string | null
          tryout_plan_id: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          club_id: string
          combined_score?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          expires_at?: string | null
          extended_count?: number | null
          fee_amount?: number | null
          fee_note?: string | null
          final_registration_id?: string | null
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name?: string | null
          history?: Json
          id?: string
          invite_id?: string | null
          is_sample?: boolean | null
          list_type?: string | null
          player_age?: number | null
          player_bib?: string | null
          player_gender?: string | null
          player_id?: string | null
          player_name?: string | null
          player_photo_url?: string | null
          proposed_at?: string | null
          proposed_by_email?: string | null
          proposed_by_name?: string | null
          rank?: number | null
          registration_id?: string | null
          responded_at?: string | null
          response_channel?: string | null
          response_note?: string | null
          sent_at?: string | null
          status?: string
          team_id?: string | null
          team_name?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          club_id?: string
          combined_score?: number | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          currency?: string | null
          expires_at?: string | null
          extended_count?: number | null
          fee_amount?: number | null
          fee_note?: string | null
          final_registration_id?: string | null
          guardian_email?: string | null
          guardian_id?: string | null
          guardian_name?: string | null
          history?: Json
          id?: string
          invite_id?: string | null
          is_sample?: boolean | null
          list_type?: string | null
          player_age?: number | null
          player_bib?: string | null
          player_gender?: string | null
          player_id?: string | null
          player_name?: string | null
          player_photo_url?: string | null
          proposed_at?: string | null
          proposed_by_email?: string | null
          proposed_by_name?: string | null
          rank?: number | null
          registration_id?: string | null
          responded_at?: string | null
          response_channel?: string | null
          response_note?: string | null
          sent_at?: string | null
          status?: string
          team_id?: string | null
          team_name?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_plans: {
        Row: {
          age_group: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          end_date: string | null
          format: string | null
          gender: string | null
          id: string
          is_sample: boolean | null
          kanban_board_id: string | null
          lead_name: string | null
          lead_user_id: string | null
          location_ids: Json | null
          location_names: Json | null
          notes: string | null
          platform_id: string | null
          platform_ids: Json | null
          platform_name: string | null
          platform_names: Json | null
          season: string | null
          start_date: string | null
          status: string | null
          team_ids: Json | null
          team_names: Json | null
          title: string | null
          updated_date: string
        }
        Insert: {
          age_group?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_date?: string | null
          format?: string | null
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          kanban_board_id?: string | null
          lead_name?: string | null
          lead_user_id?: string | null
          location_ids?: Json | null
          location_names?: Json | null
          notes?: string | null
          platform_id?: string | null
          platform_ids?: Json | null
          platform_name?: string | null
          platform_names?: Json | null
          season?: string | null
          start_date?: string | null
          status?: string | null
          team_ids?: Json | null
          team_names?: Json | null
          title?: string | null
          updated_date?: string
        }
        Update: {
          age_group?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          end_date?: string | null
          format?: string | null
          gender?: string | null
          id?: string
          is_sample?: boolean | null
          kanban_board_id?: string | null
          lead_name?: string | null
          lead_user_id?: string | null
          location_ids?: Json | null
          location_names?: Json | null
          notes?: string | null
          platform_id?: string | null
          platform_ids?: Json | null
          platform_name?: string | null
          platform_names?: Json | null
          season?: string | null
          start_date?: string | null
          status?: string | null
          team_ids?: Json | null
          team_names?: Json | null
          title?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_registrations: {
        Row: {
          attended: boolean | null
          bib_number: number | null
          checked_in: boolean | null
          checked_in_at: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          desired_age_group: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          inquiry_id: string | null
          is_sample: boolean | null
          notes: string | null
          placed_team_id: string | null
          placed_team_name: string | null
          player_id: string | null
          player_name: string | null
          registered_date: string | null
          season_name: string | null
          status: string | null
          tryout_event_id: string | null
          tryout_plan_id: string | null
          updated_date: string
        }
        Insert: {
          attended?: boolean | null
          bib_number?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          desired_age_group?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          inquiry_id?: string | null
          is_sample?: boolean | null
          notes?: string | null
          placed_team_id?: string | null
          placed_team_name?: string | null
          player_id?: string | null
          player_name?: string | null
          registered_date?: string | null
          season_name?: string | null
          status?: string | null
          tryout_event_id?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Update: {
          attended?: boolean | null
          bib_number?: number | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          desired_age_group?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          inquiry_id?: string | null
          is_sample?: boolean | null
          notes?: string | null
          placed_team_id?: string | null
          placed_team_name?: string | null
          player_id?: string | null
          player_name?: string | null
          registered_date?: string | null
          season_name?: string | null
          status?: string | null
          tryout_event_id?: string | null
          tryout_plan_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_subtasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          default_owner_role: string | null
          due_date: string | null
          id: string
          is_sample: boolean | null
          status: string | null
          title: string | null
          tryout_task_id: string | null
          type: string | null
          updated_date: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          default_owner_role?: string | null
          due_date?: string | null
          id?: string
          is_sample?: boolean | null
          status?: string | null
          title?: string | null
          tryout_task_id?: string | null
          type?: string | null
          updated_date?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          default_owner_role?: string | null
          due_date?: string | null
          id?: string
          is_sample?: boolean | null
          status?: string | null
          title?: string | null
          tryout_task_id?: string | null
          type?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      tryout_tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          due_date: string | null
          id: string
          is_sample: boolean | null
          progress: number | null
          status: string | null
          title: string | null
          tryout_event_id: string | null
          updated_date: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          due_date?: string | null
          id?: string
          is_sample?: boolean | null
          progress?: number | null
          status?: string | null
          title?: string | null
          tryout_event_id?: string | null
          updated_date?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          due_date?: string | null
          id?: string
          is_sample?: boolean | null
          progress?: number | null
          status?: string | null
          title?: string | null
          tryout_event_id?: string | null
          updated_date?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roleses: {
        Row: {
          activated_date: string | null
          club_id: string | null
          created_by: string | null
          created_by_id: string | null
          created_date: string
          id: string
          is_sample: boolean | null
          role: string | null
          role_label: string | null
          source_invitation_id: string | null
          status: string | null
          updated_date: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          activated_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          role?: string | null
          role_label?: string | null
          source_invitation_id?: string | null
          status?: string | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          activated_date?: string | null
          club_id?: string | null
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          id?: string
          is_sample?: boolean | null
          role?: string | null
          role_label?: string | null
          source_invitation_id?: string | null
          status?: string | null
          updated_date?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      weapons: {
        Row: {
          created_by: string | null
          created_by_id: string | null
          created_date: string
          damage_dice: string | null
          damage_type: string | null
          description: string | null
          id: string
          is_sample: boolean | null
          name: string | null
          properties: Json | null
          range: string | null
          updated_date: string
          weapon_category: string | null
          weapon_type: string | null
        }
        Insert: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          id?: string
          is_sample?: boolean | null
          name?: string | null
          properties?: Json | null
          range?: string | null
          updated_date?: string
          weapon_category?: string | null
          weapon_type?: string | null
        }
        Update: {
          created_by?: string | null
          created_by_id?: string | null
          created_date?: string
          damage_dice?: string | null
          damage_type?: string | null
          description?: string | null
          id?: string
          is_sample?: boolean | null
          name?: string | null
          properties?: Json | null
          range?: string | null
          updated_date?: string
          weapon_category?: string | null
          weapon_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_my_invitations: { Args: never; Returns: number }
      can_review_club_players: { Args: { _club: string }; Returns: boolean }
      get_me: { Args: never; Returns: Json }
      get_public_pricing: { Args: never; Returns: Json }
      integration_secret_delete: {
        Args: { _club: string; _provider: string }
        Returns: undefined
      }
      integration_secret_get: {
        Args: { _club: string; _provider: string }
        Returns: string
      }
      integration_secret_put: {
        Args: { _club: string; _provider: string; _secret: string }
        Returns: undefined
      }
      is_club_manager: { Args: { _club_id: string }; Returns: boolean }
      is_system_owner: { Args: never; Returns: boolean }
      list_users: { Args: never; Returns: Json[] }
      my_clubs: {
        Args: never
        Returns: {
          club_id: string
          name: string
          role: Database["public"]["Enums"]["club_role"]
        }[]
      }
      tenant_has_console_module: {
        Args: { _club: string; _module: string }
        Returns: boolean
      }
      update_me: { Args: { p: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      club_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      club_role: ["owner", "admin", "member"],
    },
  },
} as const
