export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string;
          id: string;
          metadata: NonNullable<Json>;
          resource_id: string | null;
          resource_type: string;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          resource_id?: string | null;
          resource_type: string;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          resource_id?: string | null;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_audit_logs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'admins';
            referencedColumns: ['id'];
          },
        ];
      };
      admins: {
        Row: {
          auth_user_id: string;
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      app_notification_recipients: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          notification_id: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          notification_id: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          notification_id?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'app_notification_recipients_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'app_notifications';
            referencedColumns: ['id'];
          },
        ];
      };
      app_notifications: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          message: string;
          target_role: string | null;
          target_type: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message: string;
          target_role?: string | null;
          target_type: string;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message?: string;
          target_role?: string | null;
          target_type?: string;
          title?: string;
        };
        Relationships: [];
      };
      attendance_answers: {
        Row: {
          answer_number: number | null;
          answer_text: string | null;
          attendance_field_id: string;
          created_at: string;
          id: string;
          registration_id: string;
          updated_at: string;
        };
        Insert: {
          answer_number?: number | null;
          answer_text?: string | null;
          attendance_field_id: string;
          created_at?: string;
          id?: string;
          registration_id: string;
          updated_at?: string;
        };
        Update: {
          answer_number?: number | null;
          answer_text?: string | null;
          attendance_field_id?: string;
          created_at?: string;
          id?: string;
          registration_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_answers_attendance_field_id_fkey';
            columns: ['attendance_field_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_fields';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_answers_registration_id_fkey';
            columns: ['registration_id'];
            isOneToOne: false;
            referencedRelation: 'registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_check_ins: {
        Row: {
          attendee_kind: Database['public']['Enums']['attendee_kind'];
          created_at: string;
          event_id: string;
          first_checked_in_at: string;
          id: string;
          public_registration_id: string | null;
          registration_id: string | null;
        };
        Insert: {
          attendee_kind: Database['public']['Enums']['attendee_kind'];
          created_at?: string;
          event_id: string;
          first_checked_in_at: string;
          id?: string;
          public_registration_id?: string | null;
          registration_id?: string | null;
        };
        Update: {
          attendee_kind?: Database['public']['Enums']['attendee_kind'];
          created_at?: string;
          event_id?: string;
          first_checked_in_at?: string;
          id?: string;
          public_registration_id?: string | null;
          registration_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_check_ins_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_check_ins_public_registration_id_fkey';
            columns: ['public_registration_id'];
            isOneToOne: false;
            referencedRelation: 'public_registrations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_check_ins_registration_id_fkey';
            columns: ['registration_id'];
            isOneToOne: false;
            referencedRelation: 'registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_fields: {
        Row: {
          created_at: string;
          display_order: number;
          event_id: string;
          field_key: string;
          field_type: Database['public']['Enums']['attendance_field_type'];
          id: string;
          is_active: boolean;
          is_required: boolean;
          label: string;
          options: NonNullable<Json>;
          updated_at: string;
          validation_rules: NonNullable<Json>;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          event_id: string;
          field_key: string;
          field_type: Database['public']['Enums']['attendance_field_type'];
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label: string;
          options?: NonNullable<Json>;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          event_id?: string;
          field_key?: string;
          field_type?: Database['public']['Enums']['attendance_field_type'];
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label?: string;
          options?: NonNullable<Json>;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_fields_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_saved_views: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          view_config: NonNullable<Json>;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          view_config: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          view_config?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_saved_views_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_settings: {
        Row: {
          attendance_enabled: boolean;
          created_at: string;
          enforce_check_in_event_window: boolean;
          event_id: string;
          timeslot_enabled: boolean;
          timeslots: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          attendance_enabled?: boolean;
          created_at?: string;
          enforce_check_in_event_window?: boolean;
          event_id: string;
          timeslot_enabled?: boolean;
          timeslots?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          attendance_enabled?: boolean;
          created_at?: string;
          enforce_check_in_event_window?: boolean;
          event_id?: string;
          timeslot_enabled?: boolean;
          timeslots?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_settings_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_slot_records: {
        Row: {
          check_in_id: string;
          event_id: string;
          id: string;
          recorded_at: string;
          slot: string;
        };
        Insert: {
          check_in_id: string;
          event_id: string;
          id?: string;
          recorded_at?: string;
          slot: string;
        };
        Update: {
          check_in_id?: string;
          event_id?: string;
          id?: string;
          recorded_at?: string;
          slot?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_slot_records_check_in_id_fkey';
            columns: ['check_in_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_check_ins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_slot_records_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      email_templates: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          required_variables: NonNullable<Json>;
          resend_template_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          required_variables?: NonNullable<Json>;
          resend_template_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          required_variables?: NonNullable<Json>;
          resend_template_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_fields: {
        Row: {
          applicability: string;
          created_at: string;
          display_order: number;
          event_id: string;
          field_key: string;
          field_type: Database['public']['Enums']['event_field_type'];
          help_text: string | null;
          id: string;
          is_active: boolean;
          is_required: boolean;
          label: string;
          options: NonNullable<Json>;
          placeholder: string | null;
          updated_at: string;
          validation_rules: NonNullable<Json>;
        };
        Insert: {
          applicability?: string;
          created_at?: string;
          display_order?: number;
          event_id: string;
          field_key: string;
          field_type: Database['public']['Enums']['event_field_type'];
          help_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label: string;
          options?: NonNullable<Json>;
          placeholder?: string | null;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Update: {
          applicability?: string;
          created_at?: string;
          display_order?: number;
          event_id?: string;
          field_key?: string;
          field_type?: Database['public']['Enums']['event_field_type'];
          help_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label?: string;
          options?: NonNullable<Json>;
          placeholder?: string | null;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'event_fields_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          allow_public_registrations: boolean;
          created_at: string;
          created_by_admin_id: string | null;
          description: string | null;
          duplicate_policy: Database['public']['Enums']['duplicate_policy'];
          ends_at: string | null;
          id: string;
          location: string | null;
          metadata: NonNullable<Json>;
          registration_closes_at: string | null;
          registration_mode: Database['public']['Enums']['registration_mode'];
          registration_opens_at: string | null;
          require_id_lookup: boolean;
          slug: string;
          starts_at: string | null;
          status: Database['public']['Enums']['event_status'];
          title: string;
          updated_at: string;
          member_registration_count: number | null;
          public_registration_count: number | null;
        };
        Insert: {
          allow_public_registrations?: boolean;
          created_at?: string;
          created_by_admin_id?: string | null;
          description?: string | null;
          duplicate_policy?: Database['public']['Enums']['duplicate_policy'];
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          metadata?: NonNullable<Json>;
          registration_closes_at?: string | null;
          registration_mode?: Database['public']['Enums']['registration_mode'];
          registration_opens_at?: string | null;
          require_id_lookup?: boolean;
          slug: string;
          starts_at?: string | null;
          status?: Database['public']['Enums']['event_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          allow_public_registrations?: boolean;
          created_at?: string;
          created_by_admin_id?: string | null;
          description?: string | null;
          duplicate_policy?: Database['public']['Enums']['duplicate_policy'];
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          metadata?: NonNullable<Json>;
          registration_closes_at?: string | null;
          registration_mode?: Database['public']['Enums']['registration_mode'];
          registration_opens_at?: string | null;
          require_id_lookup?: boolean;
          slug?: string;
          starts_at?: string | null;
          status?: Database['public']['Enums']['event_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_created_by_admin_id_fkey';
            columns: ['created_by_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admins';
            referencedColumns: ['id'];
          },
        ];
      };
      form_fields: {
        Row: {
          created_at: string;
          display_order: number;
          field_applicability: string;
          field_key: string;
          field_type: Database['public']['Enums']['event_field_type'];
          form_id: string;
          help_text: string | null;
          id: string;
          is_active: boolean;
          is_required: boolean;
          label: string;
          options: NonNullable<Json>;
          placeholder: string | null;
          updated_at: string;
          validation_rules: NonNullable<Json>;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          field_applicability?: string;
          field_key: string;
          field_type: Database['public']['Enums']['event_field_type'];
          form_id: string;
          help_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label: string;
          options?: NonNullable<Json>;
          placeholder?: string | null;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          field_applicability?: string;
          field_key?: string;
          field_type?: Database['public']['Enums']['event_field_type'];
          form_id?: string;
          help_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label?: string;
          options?: NonNullable<Json>;
          placeholder?: string | null;
          updated_at?: string;
          validation_rules?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'form_fields_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'forms';
            referencedColumns: ['id'];
          },
        ];
      };
      form_submission_answers: {
        Row: {
          answer_boolean: boolean | null;
          answer_date: string | null;
          answer_json: Json | null;
          answer_number: number | null;
          answer_text: string | null;
          created_at: string;
          form_field_id: string;
          id: string;
          submission_id: string;
          updated_at: string;
        };
        Insert: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          form_field_id: string;
          id?: string;
          submission_id: string;
          updated_at?: string;
        };
        Update: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          form_field_id?: string;
          id?: string;
          submission_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'form_submission_answers_form_field_id_fkey';
            columns: ['form_field_id'];
            isOneToOne: false;
            referencedRelation: 'form_fields';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'form_submission_answers_submission_id_fkey';
            columns: ['submission_id'];
            isOneToOne: false;
            referencedRelation: 'form_submissions';
            referencedColumns: ['id'];
          },
        ];
      };
      form_submissions: {
        Row: {
          created_at: string;
          form_id: string;
          id: string;
          idempotency_key: string | null;
          public_registrant_info: Json | null;
          source: string;
          status: string;
          submitted_at: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          id?: string;
          idempotency_key?: string | null;
          public_registrant_info?: Json | null;
          source?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          id?: string;
          idempotency_key?: string | null;
          public_registrant_info?: Json | null;
          source?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'form_submissions_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'forms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'form_submissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      forms: {
        Row: {
          audience: string;
          created_at: string;
          created_by_admin_id: string | null;
          description: string | null;
          duplicate_policy: Database['public']['Enums']['duplicate_policy'];
          id: string;
          metadata: NonNullable<Json>;
          slug: string;
          status: Database['public']['Enums']['event_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          audience?: string;
          created_at?: string;
          created_by_admin_id?: string | null;
          description?: string | null;
          duplicate_policy?: Database['public']['Enums']['duplicate_policy'];
          id?: string;
          metadata?: NonNullable<Json>;
          slug: string;
          status?: Database['public']['Enums']['event_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          created_at?: string;
          created_by_admin_id?: string | null;
          description?: string | null;
          duplicate_policy?: Database['public']['Enums']['duplicate_policy'];
          id?: string;
          metadata?: NonNullable<Json>;
          slug?: string;
          status?: Database['public']['Enums']['event_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forms_created_by_admin_id_fkey';
            columns: ['created_by_admin_id'];
            isOneToOne: false;
            referencedRelation: 'admins';
            referencedColumns: ['id'];
          },
        ];
      };
      public_attendance_answers: {
        Row: {
          answer_number: number | null;
          answer_text: string | null;
          attendance_field_id: string;
          created_at: string;
          id: string;
          public_registration_id: string;
          updated_at: string;
        };
        Insert: {
          answer_number?: number | null;
          answer_text?: string | null;
          attendance_field_id: string;
          created_at?: string;
          id?: string;
          public_registration_id: string;
          updated_at?: string;
        };
        Update: {
          answer_number?: number | null;
          answer_text?: string | null;
          attendance_field_id?: string;
          created_at?: string;
          id?: string;
          public_registration_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_attendance_answers_attendance_field_id_fkey';
            columns: ['attendance_field_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_fields';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_attendance_answers_public_registration_id_fkey';
            columns: ['public_registration_id'];
            isOneToOne: false;
            referencedRelation: 'public_registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      public_registration_answers: {
        Row: {
          answer_boolean: boolean | null;
          answer_date: string | null;
          answer_json: Json | null;
          answer_number: number | null;
          answer_text: string | null;
          created_at: string;
          event_field_id: string;
          id: string;
          public_registration_id: string;
          updated_at: string;
        };
        Insert: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          event_field_id: string;
          id?: string;
          public_registration_id: string;
          updated_at?: string;
        };
        Update: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          event_field_id?: string;
          id?: string;
          public_registration_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_registration_answers_event_field_id_fkey';
            columns: ['event_field_id'];
            isOneToOne: false;
            referencedRelation: 'event_fields';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_registration_answers_public_registration_id_fkey';
            columns: ['public_registration_id'];
            isOneToOne: false;
            referencedRelation: 'public_registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      public_registrations: {
        Row: {
          created_at: string;
          email: string;
          event_id: string;
          first_name: string;
          id: string;
          idempotency_key: string | null;
          last_name: string;
          nickname: string | null;
          phone: string | null;
          registration_scope_key: string;
          status: Database['public']['Enums']['registration_status'];
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          event_id: string;
          first_name: string;
          id?: string;
          idempotency_key?: string | null;
          last_name: string;
          nickname?: string | null;
          phone?: string | null;
          registration_scope_key?: string;
          status?: Database['public']['Enums']['registration_status'];
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          event_id?: string;
          first_name?: string;
          id?: string;
          idempotency_key?: string | null;
          last_name?: string;
          nickname?: string | null;
          phone?: string | null;
          registration_scope_key?: string;
          status?: Database['public']['Enums']['registration_status'];
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_registrations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      registration_answers: {
        Row: {
          answer_boolean: boolean | null;
          answer_date: string | null;
          answer_json: Json | null;
          answer_number: number | null;
          answer_text: string | null;
          created_at: string;
          event_field_id: string;
          id: string;
          registration_id: string;
          updated_at: string;
        };
        Insert: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          event_field_id: string;
          id?: string;
          registration_id: string;
          updated_at?: string;
        };
        Update: {
          answer_boolean?: boolean | null;
          answer_date?: string | null;
          answer_json?: Json | null;
          answer_number?: number | null;
          answer_text?: string | null;
          created_at?: string;
          event_field_id?: string;
          id?: string;
          registration_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'registration_answers_event_field_id_fkey';
            columns: ['event_field_id'];
            isOneToOne: false;
            referencedRelation: 'event_fields';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'registration_answers_registration_id_fkey';
            columns: ['registration_id'];
            isOneToOne: false;
            referencedRelation: 'registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      registrations: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          idempotency_key: string | null;
          registration_scope_key: string;
          source: string;
          status: Database['public']['Enums']['registration_status'];
          submitted_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          idempotency_key?: string | null;
          registration_scope_key?: string;
          source?: string;
          status?: Database['public']['Enums']['registration_status'];
          submitted_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          idempotency_key?: string | null;
          registration_scope_key?: string;
          source?: string;
          status?: Database['public']['Enums']['registration_status'];
          submitted_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'registrations_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'registrations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      service_attendance: {
        Row: {
          checked_in_at: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_manual_entry: boolean;
          is_override: boolean;
          is_walk_in: boolean;
          metadata: NonNullable<Json>;
          rfid: string | null;
          service_date: string;
          service_seat_id: string | null;
          time_slot: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          checked_in_at?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_manual_entry?: boolean;
          is_override?: boolean;
          is_walk_in?: boolean;
          metadata?: NonNullable<Json>;
          rfid?: string | null;
          service_date: string;
          service_seat_id?: string | null;
          time_slot: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          checked_in_at?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_manual_entry?: boolean;
          is_override?: boolean;
          is_walk_in?: boolean;
          metadata?: NonNullable<Json>;
          rfid?: string | null;
          service_date?: string;
          service_seat_id?: string | null;
          time_slot?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_attendance_service_seat_id_fkey';
            columns: ['service_seat_id'];
            isOneToOne: false;
            referencedRelation: 'service_seats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_attendance_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      service_exception_dates: {
        Row: {
          created_at: string;
          exception_date: string;
          id: string;
          reason: string;
        };
        Insert: {
          created_at?: string;
          exception_date: string;
          id?: string;
          reason: string;
        };
        Update: {
          created_at?: string;
          exception_date?: string;
          id?: string;
          reason?: string;
        };
        Relationships: [];
      };
      service_layouts: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          is_active: boolean;
          metadata: NonNullable<Json>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          is_active?: boolean;
          metadata?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean;
          metadata?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      service_seats: {
        Row: {
          area: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          layout_id: string;
          metadata: NonNullable<Json>;
          seat_number: string | null;
          table_number: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          area?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          layout_id: string;
          metadata?: NonNullable<Json>;
          seat_number?: string | null;
          table_number: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          area?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          layout_id?: string;
          metadata?: NonNullable<Json>;
          seat_number?: string | null;
          table_number?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'service_seats_layout_id_fkey';
            columns: ['layout_id'];
            isOneToOne: false;
            referencedRelation: 'service_layouts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_commitment_history: {
        Row: {
          created_at: string;
          effective_date: string;
          id: string;
          metadata: NonNullable<Json>;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          effective_date: string;
          id?: string;
          metadata?: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          created_at?: string;
          effective_date?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_commitment_history_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh_key: string;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh_key: string;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh_key?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_tokens: {
        Row: {
          created_at: string;
          id: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          token?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_object_key: string | null;
          category: string;
          created_at: string;
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          last_name: string | null;
          member_id: string;
          metadata: NonNullable<Json>;
          nickname: string | null;
          phone: string | null;
          role: string;
          updated_at: string;
          last_activity: string | null;
        };
        Insert: {
          avatar_object_key?: string | null;
          category?: string;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          last_name?: string | null;
          member_id: string;
          metadata?: NonNullable<Json>;
          nickname?: string | null;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_object_key?: string | null;
          category?: string;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          last_name?: string | null;
          member_id?: string;
          metadata?: NonNullable<Json>;
          nickname?: string | null;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      archive_push_reminder: {
        Args: { message_id: number };
        Returns: boolean;
      };
      generate_upcoming_sunday_push_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      pop_push_reminders: {
        Args: { batch_size?: number };
        Returns: {
          message: { message?: string; target_url?: string; url?: string; user_id?: string };
          msg_id: number;
        }[];
      };
      apply_bulk_attendance_answer_upsert: {
        Args: { p_answers: Json; p_event_id: string; p_field_ids: string[]; p_rows: Json };
        Returns: undefined;
      };
      apply_bulk_member_upsert: {
        Args: { p_rows: Json };
        Returns: {
          inserted_count: number;
          updated_count: number;
        }[];
      };
      apply_bulk_public_registration_upsert: {
        Args: { p_answers: Json; p_event_id: string; p_field_ids: string[]; p_rows: Json };
        Returns: {
          inserted_count: number;
          updated_count: number;
        }[];
      };
      apply_bulk_registration_upsert: {
        Args: { p_answers: Json; p_event_id: string; p_field_ids: string[]; p_rows: Json };
        Returns: {
          inserted_count: number;
          updated_count: number;
        }[];
      };
      apply_bulk_service_attendance_upsert: {
        Args: { p_admin_user_id?: string; p_layout_id: string; p_rows: Json };
        Returns: {
          inserted_count: number;
          total_count: number;
          updated_count: number;
        }[];
      };
      archive_email_notification: { Args: { message_id: number }; Returns: boolean };
      broadcast_app_notification: {
        Args: {
          p_created_by?: string;
          p_message: string;
          p_target_role?: string;
          p_target_roles?: string[];
          p_target_type: string;
          p_title: string;
          p_user_ids?: string[];
        };
        Returns: string;
      };
      calculate_attendance_score: {
        Args: {
          p_absences: number;
          p_attended: number;
          p_excused: number;
          p_wi_5th_sunday?: number;
          p_wi_9am_3pm: number;
        };
        Returns: number;
      };
      duplicate_event: {
        Args: {
          p_admin_auth_user_id?: string;
          p_new_slug: string;
          p_new_title: string;
          p_source_event_id: string;
        };
        Returns: string;
      };
      duplicate_form: {
        Args: {
          p_admin_auth_user_id?: string;
          p_new_slug: string;
          p_new_title: string;
          p_source_form_id: string;
        };
        Returns: string;
      };
      enqueue_email_notification: { Args: { payload: Json }; Returns: number };
      generate_user_token: { Args: Record<PropertyKey, never>; Returns: string };
      get_admin_roles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          auth_user_id: string;
          avatar_object_key: string;
          created_at: string;
          email: string;
          has_member_profile: boolean;
          id: string;
          name: string;
          role: string;
        }[];
      };
      get_broadcast_dashboard_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      get_commitment_dashboard_stats: {
        Args: {
          p_category?: string;
          p_end_date: string;
          p_excuse_event_id?: string;
          p_page?: number;
          p_page_size?: number;
          p_role?: string;
          p_search_query?: string;
          p_start_date: string;
        };
        Returns: {
          absences: number;
          attendance_score: number;
          attended: number;
          avatar_object_key: string;
          category: string;
          committed: number;
          email: string;
          excused: number;
          full_name: string;
          member_id: string;
          nickname: string;
          role: string;
          start_date: string;
          total_count: number;
          user_id: string;
          wi_12nn: number;
          wi_5th_sunday: number;
          wi_9am_3pm: number;
        }[];
      };
      get_current_admin_id: { Args: Record<PropertyKey, never>; Returns: string };
      get_event_registration_count: { Args: { p_event_id: string }; Returns: number };
      get_member_event_history: { Args: { p_user_id: string }; Returns: Json };
      get_member_service_attendance_stats: {
        Args: {
          p_end_date: string;
          p_page?: number;
          p_page_size?: number;
          p_search_query?: string;
          p_start_date: string;
        };
        Returns: {
          email: string;
          full_name: string;
          member_id: string;
          total_checkins: number;
          total_count: number;
          total_manual_entries: number;
          total_missed_commitments: number;
          total_overrides: number;
          total_walkins: number;
          user_id: string;
        }[];
      };
      get_nearest_upcoming_sunday: { Args: { base_date: string }; Returns: string };
      get_public_event_registration_count: { Args: { p_event_id: string }; Returns: number };
      get_service_dashboard_stats: {
        Args: {
          p_end_date?: string;
          p_month?: number;
          p_start_date?: string;
          p_sunday_date?: string;
          p_year?: number;
        };
        Returns: Json;
      };
      get_total_event_registration_count: { Args: { p_event_id: string }; Returns: number };
      get_volunteer_attendance_log: {
        Args: {
          p_end_date: string;
          p_excuse_event_id?: string;
          p_start_date: string;
          p_user_id: string;
        };
        Returns: {
          checked_in_at: string;
          id: string;
          is_manual_entry: boolean;
          is_override: boolean;
          is_walk_in: boolean;
          service_date: string;
          status: string;
          time_slot: string;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin_member_viewer: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin_or_slod: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin_viewer: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_check_in_operator: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_kiosk: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_valid_email: { Args: { email_input: string; strict?: boolean }; Returns: boolean };
      jsonb_diff: {
        Args: { ignored_keys?: string[]; val_new: Json; val_old: Json };
        Returns: Json;
      };
      last_activity: { Args: { u: Database['public']['Tables']['users']['Row'] }; Returns: string };
      list_auth_users: {
        Args: { p_search?: string };
        Returns: {
          avatar_object_key: string;
          created_at: string;
          email: string;
          has_member_profile: boolean;
          id: string;
          last_sign_in_at: string;
          name: string;
        }[];
      };
      list_event_attendees_v2: {
        Args: { p_event_id: string };
        Returns: {
          attendance_enabled: boolean;
          results: Json;
        }[];
      };
      list_unregistered_members: {
        Args: {
          p_event_id: string;
          p_offset: number;
          p_page_size: number;
          p_search_term: string | null;
        };
        Returns: {
          items: Json;
          total_count: number;
        }[];
      };
      list_verified_auth_users: {
        Args: { p_search?: string };
        Returns: {
          avatar_object_key: string;
          created_at: string;
          email: string;
          full_name: string;
          has_member_profile: boolean;
          id: string;
          last_name: string;
          last_sign_in_at: string;
          name: string;
        }[];
      };
      member_registration_count: {
        Args: { e: Database['public']['Tables']['events']['Row'] };
        Returns: number;
      };
      pop_email_notifications: {
        Args: { batch_size?: number };
        Returns: {
          enqueued_at: string;
          message: Json;
          msg_id: number;
          read_ct: number;
          vt: string;
        }[];
      };
      public_registration_count: {
        Args: { e: Database['public']['Tables']['events']['Row'] };
        Returns: number;
      };
      reorder_attendance_fields: {
        Args: { p_event_id: string; p_ordered_ids: string[] };
        Returns: undefined;
      };
      reorder_event_fields: {
        Args: { p_event_id: string; p_ordered_ids: string[] };
        Returns: undefined;
      };
      reorder_form_fields: {
        Args: { p_field_ids: string[]; p_form_id: string };
        Returns: undefined;
      };
      tokenize_all_users: { Args: Record<PropertyKey, never>; Returns: number };
      trigger_email_processor: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: {
      attendance_field_type:
        | 'text'
        | 'textarea'
        | 'number'
        | 'email'
        | 'phone'
        | 'select'
        | 'radio'
        | 'checkbox'
        | 'multi_select'
        | 'multi_select_toggle'
        | 'date'
        | 'datetime'
        | 'boolean'
        | 'color_picker';
      attendee_kind: 'registered' | 'public';
      duplicate_policy: 'block' | 'allow_update' | 'allow_multiple' | 'allow_multiple_update';
      event_field_type:
        | 'text'
        | 'textarea'
        | 'number'
        | 'email'
        | 'phone'
        | 'select'
        | 'radio'
        | 'checkbox'
        | 'multi_select'
        | 'date'
        | 'datetime'
        | 'boolean'
        | 'multi_select_toggle'
        | 'color_picker';
      event_status: 'draft' | 'published' | 'archived';
      registration_mode: 'open' | 'closed';
      registration_status: 'submitted' | 'updated' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_field_type: [
        'text',
        'textarea',
        'number',
        'email',
        'phone',
        'select',
        'radio',
        'checkbox',
        'multi_select',
        'multi_select_toggle',
        'date',
        'datetime',
        'boolean',
        'color_picker',
      ],
      attendee_kind: ['registered', 'public'],
      duplicate_policy: ['block', 'allow_update', 'allow_multiple', 'allow_multiple_update'],
      event_field_type: [
        'text',
        'textarea',
        'number',
        'email',
        'phone',
        'select',
        'radio',
        'checkbox',
        'multi_select',
        'date',
        'datetime',
        'boolean',
        'multi_select_toggle',
        'color_picker',
      ],
      event_status: ['draft', 'published', 'archived'],
      registration_mode: ['open', 'closed'],
      registration_status: ['submitted', 'updated', 'cancelled'],
    },
  },
} as const;
