export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type AppRole = 'student' | 'faculty' | 'admin'
export type DocumentKind = 'resume' | 'offer_letter' | 'certificate' | 'self_found' | 'experience' | 'other'

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          auth_user_id: string | null
          email: string
          full_name: string
          role: AppRole
          status: string
          login_identifier: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          auth_user_id?: string | null
          email: string
          full_name: string
          role: AppRole
          status?: string
          login_identifier?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          auth_user_id?: string | null
          email?: string
          full_name?: string
          role?: AppRole
          status?: string
          login_identifier?: string | null
          updated_at?: string
        }
      >
      students: Table<
        {
          profile_id: string
          roll_number: string
          branch: string
          year: number
          section: string
          phone: string | null
          skills: Json
          certifications: Json
          programming_languages: Json
          tools: Json
          linked_in: string | null
          github: string | null
          preferred_domain: string | null
          preferred_mode: string | null
          preferred_location: string | null
        },
        {
          profile_id: string
          roll_number: string
          branch: string
          year: number
          section: string
          phone?: string | null
          skills?: Json
          certifications?: Json
          programming_languages?: Json
          tools?: Json
          linked_in?: string | null
          github?: string | null
          preferred_domain?: string | null
          preferred_mode?: string | null
          preferred_location?: string | null
        },
        {
          roll_number?: string
          branch?: string
          year?: number
          section?: string
          phone?: string | null
          skills?: Json
          certifications?: Json
          programming_languages?: Json
          tools?: Json
          linked_in?: string | null
          github?: string | null
          preferred_domain?: string | null
          preferred_mode?: string | null
          preferred_location?: string | null
        }
      >
      documents: Table<
        {
          id: string
          student_id: string
          kind: DocumentKind
          file_name: string
          storage_path: string
          mime_type: string
          size_bytes: number
          status: string
          created_at: string
        },
        {
          student_id: string
          kind: DocumentKind
          file_name: string
          storage_path: string
          mime_type: string
          size_bytes?: number
          status?: string
        },
        {
          status?: string
        }
      >
      notifications: Table<
        {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          read_at: string | null
          created_at: string
        },
        {
          user_id: string
          title: string
          body: string
          type?: string
          read_at?: string | null
        },
        {
          read_at?: string | null
        }
      >
      faculty: Table<
        {
          profile_id: string
          employee_id: string
          department_code: string
          designation: string
          status: string
          verified_at: string | null
          approved_by: string | null
          notes: string | null
        },
        {
          profile_id: string
          employee_id: string
          department_code: string
          designation: string
          status?: string
          verified_at?: string | null
          approved_by?: string | null
          notes?: string | null
        },
        {
          employee_id?: string
          department_code?: string
          designation?: string
          status?: string
          verified_at?: string | null
          approved_by?: string | null
          notes?: string | null
        }
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: AppRole
    }
    CompositeTypes: Record<string, never>
  }
}
