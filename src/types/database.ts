export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'clinic_admin' | 'doctor' | 'receptionist'
export type MediaType = 'image' | 'video'
export type CallType = 'booking' | 'query' | 'followup'
export type CallOutcome = 'booked' | 'not_booked' | 'callback' | 'transferred'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type SpeakerType = 'user' | 'ai'

// ─── Clinic OS module enums (migration 0005) ────────────────────────────────
export type ReminderChannel = 'voice' | 'whatsapp' | 'sms'
export type ReminderEventType = 'scheduled' | 'sent' | 'delivered' | 'failed' | 'opened' | 'responded' | 'cancelled'
export type FollowUpPlanStatus = 'active' | 'completed' | 'cancelled'
export type AdherenceResponse = 'taken' | 'missed' | 'feeling_better' | 'side_effects' | 'call_me' | 'no_response'
export type AdherenceChannel = 'voice' | 'whatsapp' | 'sms' | 'staff'
export type AdherenceAlertType = 'repeated_missed' | 'side_effects' | 'callback_requested'
export type AdherenceAlertStatus = 'open' | 'acknowledged' | 'resolved'
export type TriageSource = 'website' | 'counter' | 'voice_followup'
export type TriageAgeGroup = 'infant' | 'child' | 'adult' | 'senior'
export type TriageSessionStatus = 'submitted' | 'reviewed'
export type TriageCategory = 'emergency' | 'urgent_same_day' | 'routine' | 'follow_up'
export type LabReportStatus = 'entered' | 'explained' | 'reviewed'
export type LabMarkerFlag = 'low' | 'high' | 'normal' | 'critical'
export type LabNextActionCategory = 'routine_review' | 'discuss_soon' | 'urgent_review'

// ─── Clinic Ledger enums (migration 0006) ────────────────────────────────────
export type LedgerEntryType = 'patient_collection' | 'patient_refund' | 'staff_expense' | 'clinic_expense' | 'other'
export type LedgerPaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other'

export interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration_days: number
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          full_name: string | null
          role: UserRole
          clinic_id: string | null
          doctor_id: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          full_name?: string | null
          role?: UserRole
          clinic_id?: string | null
          doctor_id?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          password_hash?: string
          full_name?: string | null
          role?: UserRole
          clinic_id?: string | null
          doctor_id?: string | null
          is_active?: boolean
          last_login?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'users_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'users_doctor_id_fkey'; columns: ['doctor_id']; referencedRelation: 'doctors'; referencedColumns: ['id'] }
        ]
      }
      clinics: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          country: string | null
          logo_url: string | null
          is_active: boolean
          onboarding_mode: 'forwarding' | 'llp_dedicated' | 'own_kyc'
          forwarded_from_number: string | null
          twilio_number: string | null
          twilio_number_owner: 'platform' | 'clinic' | null
          twilio_number_sid: string | null
          website_enabled: boolean
          website_url: string | null
          website_slug: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          logo_url?: string | null
          is_active?: boolean
          onboarding_mode?: 'forwarding' | 'llp_dedicated' | 'own_kyc'
          forwarded_from_number?: string | null
          twilio_number?: string | null
          twilio_number_owner?: 'platform' | 'clinic' | null
          twilio_number_sid?: string | null
          website_enabled?: boolean
          website_url?: string | null
          website_slug?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          logo_url?: string | null
          is_active?: boolean
          onboarding_mode?: 'forwarding' | 'llp_dedicated' | 'own_kyc'
          forwarded_from_number?: string | null
          twilio_number?: string | null
          twilio_number_owner?: 'platform' | 'clinic' | null
          twilio_number_sid?: string | null
          website_enabled?: boolean
          website_url?: string | null
          website_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          clinic_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_active?: boolean
        }
        Relationships: [
          { foreignKeyName: 'departments_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      doctors: {
        Row: {
          id: string
          clinic_id: string
          department_id: string | null
          full_name: string
          specialization: string | null
          phone: string | null
          email: string | null
          bio: string | null
          avatar_url: string | null
          is_active: boolean
          booking_min_hours: number
          booking_max_days: number
          slot_duration_minutes: number
          years_of_experience: number | null
          qualifications: string | null
          consultation_fee: number | null
          languages_spoken: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          department_id?: string | null
          full_name: string
          specialization?: string | null
          phone?: string | null
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_active?: boolean
          booking_min_hours?: number
          booking_max_days?: number
          slot_duration_minutes?: number
          years_of_experience?: number | null
          qualifications?: string | null
          consultation_fee?: number | null
          languages_spoken?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          department_id?: string | null
          full_name?: string
          specialization?: string | null
          phone?: string | null
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_active?: boolean
          booking_min_hours?: number
          booking_max_days?: number
          slot_duration_minutes?: number
          years_of_experience?: number | null
          qualifications?: string | null
          consultation_fee?: number | null
          languages_spoken?: string[] | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'doctors_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'doctors_department_id_fkey'; columns: ['department_id']; referencedRelation: 'departments'; referencedColumns: ['id'] }
        ]
      }
      doctor_availability: {
        Row: {
          id: string
          doctor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          day_of_week: number
          start_time?: string
          end_time?: string
          is_available?: boolean
          created_at?: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
        }
        Relationships: [
          { foreignKeyName: 'doctor_availability_doctor_id_fkey'; columns: ['doctor_id']; referencedRelation: 'doctors'; referencedColumns: ['id'] }
        ]
      }
      patients: {
        Row: {
          id: string
          clinic_id: string
          full_name: string
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          full_name: string
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'patients_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          duration_minutes: number
          status: AppointmentStatus
          reason: string | null
          notes: string | null
          booked_via: string
          no_show_marked_at: string | null
          no_show_marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          duration_minutes?: number
          status?: AppointmentStatus
          reason?: string | null
          notes?: string | null
          booked_via?: string
          no_show_marked_at?: string | null
          no_show_marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          duration_minutes?: number
          status?: AppointmentStatus
          reason?: string | null
          notes?: string | null
          booked_via?: string
          no_show_marked_at?: string | null
          no_show_marked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'appointments_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_doctor_id_fkey'; columns: ['doctor_id']; referencedRelation: 'doctors'; referencedColumns: ['id'] }
        ]
      }
      clinic_website_content: {
        Row: {
          id: string
          clinic_id: string
          hero_slides: Json
          about_title: string | null
          about_text: string | null
          services: Json
          contact_info: Json
          seo_title: string | null
          seo_description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          hero_slides?: Json
          about_title?: string | null
          about_text?: string | null
          services?: Json
          contact_info?: Json
          seo_title?: string | null
          seo_description?: string | null
          updated_at?: string
        }
        Update: {
          hero_slides?: Json
          about_title?: string | null
          about_text?: string | null
          services?: Json
          contact_info?: Json
          seo_title?: string | null
          seo_description?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'clinic_website_content_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      clinic_gallery: {
        Row: {
          id: string
          clinic_id: string
          media_type: MediaType
          url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          media_type?: MediaType
          url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          media_type?: MediaType
          url?: string
          caption?: string | null
          sort_order?: number
        }
        Relationships: [
          { foreignKeyName: 'clinic_gallery_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      voice_agent_config: {
        Row: {
          id: string
          clinic_id: string
          is_enabled: boolean
          voice_type: string
          language: string
          greeting_message: string | null
          working_hours_start: string
          working_hours_end: string
          working_days: number[]
          booking_rules: Json
          max_call_duration_seconds: number
          fallback_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          is_enabled?: boolean
          voice_type?: string
          language?: string
          greeting_message?: string | null
          working_hours_start?: string
          working_hours_end?: string
          working_days?: number[]
          booking_rules?: Json
          max_call_duration_seconds?: number
          fallback_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          voice_type?: string
          language?: string
          greeting_message?: string | null
          working_hours_start?: string
          working_hours_end?: string
          working_days?: number[]
          booking_rules?: Json
          max_call_duration_seconds?: number
          fallback_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'voice_agent_config_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      calls: {
        Row: {
          id: string
          clinic_id: string
          phone_number: string
          patient_id: string | null
          call_type: CallType
          intent: string | null
          duration_seconds: number | null
          outcome: CallOutcome | null
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          phone_number: string
          patient_id?: string | null
          call_type?: CallType
          intent?: string | null
          duration_seconds?: number | null
          outcome?: CallOutcome | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          patient_id?: string | null
          call_type?: CallType
          intent?: string | null
          duration_seconds?: number | null
          outcome?: CallOutcome | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'calls_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'calls_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      conversations: {
        Row: {
          id: string
          call_id: string
          speaker: SpeakerType
          message: string
          timestamp: string
        }
        Insert: {
          id?: string
          call_id: string
          speaker: SpeakerType
          message: string
          timestamp?: string
        }
        Update: {
          message?: string
        }
        Relationships: [
          { foreignKeyName: 'conversations_call_id_fkey'; columns: ['call_id']; referencedRelation: 'calls'; referencedColumns: ['id'] }
        ]
      }
      reminder_settings: {
        Row: {
          id: string
          clinic_id: string
          is_enabled: boolean
          appointment_24h_enabled: boolean
          appointment_2h_enabled: boolean
          post_visit_enabled: boolean
          birthday_enabled: boolean
          annual_checkup_enabled: boolean
          broadcast_enabled: boolean
          call_window_start: string
          call_window_end: string
          call_days: number[]
          language: string
          voice_id: string | null
          template_appointment_24h: string | null
          template_appointment_2h: string | null
          template_post_visit: string | null
          template_birthday: string | null
          max_retries: number
          retry_gap_minutes: number
          channel_appointment_24h: ReminderChannel
          channel_appointment_2h: ReminderChannel
          channel_post_visit: ReminderChannel
          channel_birthday: ReminderChannel
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          is_enabled?: boolean
          appointment_24h_enabled?: boolean
          appointment_2h_enabled?: boolean
          post_visit_enabled?: boolean
          birthday_enabled?: boolean
          annual_checkup_enabled?: boolean
          broadcast_enabled?: boolean
          call_window_start?: string
          call_window_end?: string
          call_days?: number[]
          language?: string
          voice_id?: string | null
          template_appointment_24h?: string | null
          template_appointment_2h?: string | null
          template_post_visit?: string | null
          template_birthday?: string | null
          max_retries?: number
          retry_gap_minutes?: number
          channel_appointment_24h?: ReminderChannel
          channel_appointment_2h?: ReminderChannel
          channel_post_visit?: ReminderChannel
          channel_birthday?: ReminderChannel
          created_at?: string
          updated_at?: string
        }
        Update: {
          is_enabled?: boolean
          appointment_24h_enabled?: boolean
          appointment_2h_enabled?: boolean
          post_visit_enabled?: boolean
          birthday_enabled?: boolean
          annual_checkup_enabled?: boolean
          broadcast_enabled?: boolean
          call_window_start?: string
          call_window_end?: string
          call_days?: number[]
          language?: string
          voice_id?: string | null
          template_appointment_24h?: string | null
          template_appointment_2h?: string | null
          template_post_visit?: string | null
          template_birthday?: string | null
          max_retries?: number
          retry_gap_minutes?: number
          channel_appointment_24h?: ReminderChannel
          channel_appointment_2h?: ReminderChannel
          channel_post_visit?: ReminderChannel
          channel_birthday?: ReminderChannel
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'reminder_settings_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      appointment_reminders: {
        Row: {
          id: string
          clinic_id: string
          appointment_id: string | null
          patient_id: string
          type: string
          status: string
          response: string | null
          channel: ReminderChannel
          scheduled_at: string
          placed_at: string | null
          ended_at: string | null
          to_number: string
          from_number: string | null
          provider_call_sid: string | null
          provider: string
          spoken_script: string | null
          duration_seconds: number | null
          dtmf_received: string | null
          attempt: number
          cost_paise: number | null
          error_message: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          appointment_id?: string | null
          patient_id: string
          type: string
          status?: string
          response?: string | null
          channel?: ReminderChannel
          scheduled_at: string
          placed_at?: string | null
          ended_at?: string | null
          to_number: string
          from_number?: string | null
          provider_call_sid?: string | null
          provider?: string
          spoken_script?: string | null
          duration_seconds?: number | null
          dtmf_received?: string | null
          attempt?: number
          cost_paise?: number | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          response?: string | null
          channel?: ReminderChannel
          placed_at?: string | null
          ended_at?: string | null
          from_number?: string | null
          provider_call_sid?: string | null
          provider?: string
          spoken_script?: string | null
          duration_seconds?: number | null
          dtmf_received?: string | null
          attempt?: number
          cost_paise?: number | null
          error_message?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'appointment_reminders_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointment_reminders_appointment_id_fkey'; columns: ['appointment_id']; referencedRelation: 'appointments'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointment_reminders_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      reminder_events: {
        Row: {
          id: string
          reminder_id: string
          event_type: ReminderEventType
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          reminder_id: string
          event_type: ReminderEventType
          payload?: Json
          created_at?: string
        }
        Update: {
          event_type?: ReminderEventType
          payload?: Json
        }
        Relationships: [
          { foreignKeyName: 'reminder_events_reminder_id_fkey'; columns: ['reminder_id']; referencedRelation: 'appointment_reminders'; referencedColumns: ['id'] }
        ]
      }
      clinic_subscriptions: {
        Row: {
          id: string
          clinic_id: string
          plan: string
          status: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          monthly_call_limit: number | null
          calls_used_this_cycle: number
          feature_overrides: Json
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          plan?: string
          status?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          monthly_call_limit?: number | null
          calls_used_this_cycle?: number
          feature_overrides?: Json
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: string
          status?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          monthly_call_limit?: number | null
          calls_used_this_cycle?: number
          feature_overrides?: Json
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'clinic_subscriptions_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          plan_code: string
          display_name: string
          description: string | null
          monthly_price_inr: number
          annual_price_inr: number | null
          monthly_call_limit: number | null
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_code: string
          display_name: string
          description?: string | null
          monthly_price_inr: number
          annual_price_inr?: number | null
          monthly_call_limit?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          description?: string | null
          monthly_price_inr?: number
          annual_price_inr?: number | null
          monthly_call_limit?: number | null
          features?: Json
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      follow_up_plans: {
        Row: {
          id: string
          clinic_id: string
          appointment_id: string | null
          patient_id: string
          created_by: string | null
          medicines: Json
          reminder_frequency: string
          follow_up_date: string | null
          care_instructions: string | null
          escalation_contact: string | null
          status: FollowUpPlanStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          appointment_id?: string | null
          patient_id: string
          created_by?: string | null
          medicines?: Json
          reminder_frequency?: string
          follow_up_date?: string | null
          care_instructions?: string | null
          escalation_contact?: string | null
          status?: FollowUpPlanStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          medicines?: Json
          reminder_frequency?: string
          follow_up_date?: string | null
          care_instructions?: string | null
          escalation_contact?: string | null
          status?: FollowUpPlanStatus
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'follow_up_plans_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'follow_up_plans_appointment_id_fkey'; columns: ['appointment_id']; referencedRelation: 'appointments'; referencedColumns: ['id'] },
          { foreignKeyName: 'follow_up_plans_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      adherence_logs: {
        Row: {
          id: string
          follow_up_plan_id: string
          patient_id: string
          channel: AdherenceChannel
          response: AdherenceResponse
          note: string | null
          created_via: string
          logged_at: string
        }
        Insert: {
          id?: string
          follow_up_plan_id: string
          patient_id: string
          channel?: AdherenceChannel
          response: AdherenceResponse
          note?: string | null
          created_via?: string
          logged_at?: string
        }
        Update: {
          note?: string | null
        }
        Relationships: [
          { foreignKeyName: 'adherence_logs_follow_up_plan_id_fkey'; columns: ['follow_up_plan_id']; referencedRelation: 'follow_up_plans'; referencedColumns: ['id'] },
          { foreignKeyName: 'adherence_logs_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      adherence_alerts: {
        Row: {
          id: string
          clinic_id: string
          follow_up_plan_id: string
          patient_id: string
          alert_type: AdherenceAlertType
          status: AdherenceAlertStatus
          acknowledged_by: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          follow_up_plan_id: string
          patient_id: string
          alert_type: AdherenceAlertType
          status?: AdherenceAlertStatus
          acknowledged_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          status?: AdherenceAlertStatus
          acknowledged_by?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'adherence_alerts_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'adherence_alerts_follow_up_plan_id_fkey'; columns: ['follow_up_plan_id']; referencedRelation: 'follow_up_plans'; referencedColumns: ['id'] },
          { foreignKeyName: 'adherence_alerts_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] }
        ]
      }
      symptom_triage_sessions: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string | null
          appointment_id: string | null
          source: TriageSource
          age_group: TriageAgeGroup | null
          status: TriageSessionStatus
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id?: string | null
          appointment_id?: string | null
          source: TriageSource
          age_group?: TriageAgeGroup | null
          status?: TriageSessionStatus
          created_by?: string | null
          created_at?: string
        }
        Update: {
          status?: TriageSessionStatus
        }
        Relationships: [
          { foreignKeyName: 'symptom_triage_sessions_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'symptom_triage_sessions_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] },
          { foreignKeyName: 'symptom_triage_sessions_appointment_id_fkey'; columns: ['appointment_id']; referencedRelation: 'appointments'; referencedColumns: ['id'] }
        ]
      }
      triage_answers: {
        Row: {
          id: string
          session_id: string
          chief_complaint: string
          duration: string | null
          fever: boolean
          pain_severity: number | null
          existing_conditions: string[]
          current_medicines: string[]
          red_flags: string[]
          raw_answers: Json
        }
        Insert: {
          id?: string
          session_id: string
          chief_complaint: string
          duration?: string | null
          fever?: boolean
          pain_severity?: number | null
          existing_conditions?: string[]
          current_medicines?: string[]
          red_flags?: string[]
          raw_answers?: Json
        }
        Update: {
          duration?: string | null
          fever?: boolean
          pain_severity?: number | null
          existing_conditions?: string[]
          current_medicines?: string[]
          red_flags?: string[]
          raw_answers?: Json
        }
        Relationships: [
          { foreignKeyName: 'triage_answers_session_id_fkey'; columns: ['session_id']; referencedRelation: 'symptom_triage_sessions'; referencedColumns: ['id'] }
        ]
      }
      triage_results: {
        Row: {
          id: string
          session_id: string
          category: TriageCategory
          summary: string
          doctor_notes: string | null
          suggested_department_id: string | null
          suggested_doctor_id: string | null
          ai_model: string | null
          is_ai_edited: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          category: TriageCategory
          summary: string
          doctor_notes?: string | null
          suggested_department_id?: string | null
          suggested_doctor_id?: string | null
          ai_model?: string | null
          is_ai_edited?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          category?: TriageCategory
          summary?: string
          doctor_notes?: string | null
          suggested_department_id?: string | null
          suggested_doctor_id?: string | null
          is_ai_edited?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'triage_results_session_id_fkey'; columns: ['session_id']; referencedRelation: 'symptom_triage_sessions'; referencedColumns: ['id'] },
          { foreignKeyName: 'triage_results_suggested_department_id_fkey'; columns: ['suggested_department_id']; referencedRelation: 'departments'; referencedColumns: ['id'] },
          { foreignKeyName: 'triage_results_suggested_doctor_id_fkey'; columns: ['suggested_doctor_id']; referencedRelation: 'doctors'; referencedColumns: ['id'] }
        ]
      }
      lab_reports: {
        Row: {
          id: string
          clinic_id: string
          patient_id: string
          appointment_id: string | null
          uploaded_file_url: string | null
          report_date: string | null
          lab_name: string | null
          entered_by: string | null
          status: LabReportStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          patient_id: string
          appointment_id?: string | null
          uploaded_file_url?: string | null
          report_date?: string | null
          lab_name?: string | null
          entered_by?: string | null
          status?: LabReportStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          uploaded_file_url?: string | null
          report_date?: string | null
          lab_name?: string | null
          status?: LabReportStatus
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'lab_reports_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'lab_reports_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] },
          { foreignKeyName: 'lab_reports_appointment_id_fkey'; columns: ['appointment_id']; referencedRelation: 'appointments'; referencedColumns: ['id'] }
        ]
      }
      lab_report_markers: {
        Row: {
          id: string
          lab_report_id: string
          marker_name: string
          value: string
          unit: string | null
          reference_range: string | null
          is_abnormal: boolean
          flag: LabMarkerFlag
          sort_order: number
        }
        Insert: {
          id?: string
          lab_report_id: string
          marker_name: string
          value: string
          unit?: string | null
          reference_range?: string | null
          is_abnormal?: boolean
          flag?: LabMarkerFlag
          sort_order?: number
        }
        Update: {
          marker_name?: string
          value?: string
          unit?: string | null
          reference_range?: string | null
          is_abnormal?: boolean
          flag?: LabMarkerFlag
          sort_order?: number
        }
        Relationships: [
          { foreignKeyName: 'lab_report_markers_lab_report_id_fkey'; columns: ['lab_report_id']; referencedRelation: 'lab_reports'; referencedColumns: ['id'] }
        ]
      }
      lab_explanations: {
        Row: {
          id: string
          lab_report_id: string
          patient_summary_en: string
          patient_summary_hi: string | null
          abnormal_markers_summary: string | null
          doctor_discussion_points: string | null
          next_action_category: LabNextActionCategory
          ai_model: string | null
          is_ai_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lab_report_id: string
          patient_summary_en: string
          patient_summary_hi?: string | null
          abnormal_markers_summary?: string | null
          doctor_discussion_points?: string | null
          next_action_category: LabNextActionCategory
          ai_model?: string | null
          is_ai_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          patient_summary_en?: string
          patient_summary_hi?: string | null
          abnormal_markers_summary?: string | null
          doctor_discussion_points?: string | null
          next_action_category?: LabNextActionCategory
          is_ai_edited?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'lab_explanations_lab_report_id_fkey'; columns: ['lab_report_id']; referencedRelation: 'lab_reports'; referencedColumns: ['id'] }
        ]
      }
      clinic_ledger_entries: {
        Row: {
          id: string
          clinic_id: string
          entry_type: LedgerEntryType
          amount_paise: number
          is_credit: boolean
          appointment_id: string | null
          patient_id: string | null
          related_entry_id: string | null
          payment_method: LedgerPaymentMethod | null
          note: string | null
          entry_date: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          entry_type: LedgerEntryType
          amount_paise: number
          is_credit?: boolean
          appointment_id?: string | null
          patient_id?: string | null
          related_entry_id?: string | null
          payment_method?: LedgerPaymentMethod | null
          note?: string | null
          entry_date?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          entry_type?: LedgerEntryType
          amount_paise?: number
          is_credit?: boolean
          appointment_id?: string | null
          patient_id?: string | null
          related_entry_id?: string | null
          payment_method?: LedgerPaymentMethod | null
          note?: string | null
          entry_date?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'clinic_ledger_entries_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'clinic_ledger_entries_appointment_id_fkey'; columns: ['appointment_id']; referencedRelation: 'appointments'; referencedColumns: ['id'] },
          { foreignKeyName: 'clinic_ledger_entries_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] },
          { foreignKeyName: 'clinic_ledger_entries_related_entry_id_fkey'; columns: ['related_entry_id']; referencedRelation: 'clinic_ledger_entries'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      call_type: CallType
      call_outcome: CallOutcome
      appointment_status: AppointmentStatus
      speaker_type: SpeakerType
      media_type: MediaType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience row types
export type AppUser = Database['public']['Tables']['users']['Row']
export type Clinic = Database['public']['Tables']['clinics']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type Doctor = Database['public']['Tables']['doctors']['Row']
export type DoctorAvailability = Database['public']['Tables']['doctor_availability']['Row']
export type Patient = Database['public']['Tables']['patients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type VoiceAgentConfig = Database['public']['Tables']['voice_agent_config']['Row']
export type Call = Database['public']['Tables']['calls']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ClinicWebsiteContent = Database['public']['Tables']['clinic_website_content']['Row']
export type ClinicGallery = Database['public']['Tables']['clinic_gallery']['Row']
export type ReminderSettings = Database['public']['Tables']['reminder_settings']['Row']
export type AppointmentReminder = Database['public']['Tables']['appointment_reminders']['Row']
export type ReminderEvent = Database['public']['Tables']['reminder_events']['Row']
export type ClinicSubscription = Database['public']['Tables']['clinic_subscriptions']['Row']
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type FollowUpPlan = Database['public']['Tables']['follow_up_plans']['Row']
export type AdherenceLog = Database['public']['Tables']['adherence_logs']['Row']
export type AdherenceAlert = Database['public']['Tables']['adherence_alerts']['Row']
export type SymptomTriageSession = Database['public']['Tables']['symptom_triage_sessions']['Row']
export type TriageAnswers = Database['public']['Tables']['triage_answers']['Row']
export type TriageResult = Database['public']['Tables']['triage_results']['Row']
export type LabReport = Database['public']['Tables']['lab_reports']['Row']
export type LabReportMarker = Database['public']['Tables']['lab_report_markers']['Row']
export type LabExplanation = Database['public']['Tables']['lab_explanations']['Row']
export type ClinicLedgerEntry = Database['public']['Tables']['clinic_ledger_entries']['Row']

export interface HeroSlide {
  id: string
  type: 'image' | 'video'
  url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
}

export interface WebsiteService {
  id: string
  icon: string
  title: string
  description: string
}

export interface WebsiteContactInfo {
  phone: string
  email: string
  address: string
  working_hours: string
  map_embed_url: string
}
