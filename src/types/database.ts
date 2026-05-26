export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'clinic_admin'
export type CallType = 'booking' | 'query' | 'followup'
export type CallOutcome = 'booked' | 'not_booked' | 'callback' | 'transferred'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type SpeakerType = 'user' | 'ai'

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
          is_active?: boolean
          last_login?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'users_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] }
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
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'appointments_clinic_id_fkey'; columns: ['clinic_id']; referencedRelation: 'clinics'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_patient_id_fkey'; columns: ['patient_id']; referencedRelation: 'patients'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_doctor_id_fkey'; columns: ['doctor_id']; referencedRelation: 'doctors'; referencedColumns: ['id'] }
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
