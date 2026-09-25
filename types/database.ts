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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attraction_categories: {
        Row: {
          attraction_id: string
          category_id: string
        }
        Insert: {
          attraction_id: string
          category_id: string
        }
        Update: {
          attraction_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attraction_categories_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attraction_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      attractions: {
        Row: {
          address: string | null
          avg_visit_minutes: number
          booking_required: boolean
          contact: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_free: boolean
          is_published: boolean
          is_sample: boolean
          lat: number | null
          lng: number | null
          location_id: string | null
          name: string
          opening_hours: Json
          price_max: number
          price_min: number
          slug: string
          summary: string | null
          tips: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avg_visit_minutes?: number
          booking_required?: boolean
          contact?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name: string
          opening_hours?: Json
          price_max?: number
          price_min?: number
          slug: string
          summary?: string | null
          tips?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avg_visit_minutes?: number
          booking_required?: boolean
          contact?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name?: string
          opening_hours?: Json
          price_max?: number
          price_min?: number
          slug?: string
          summary?: string | null
          tips?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attractions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attractions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          cancellation_reason: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          experience_id: string
          experience_slug: string
          experience_title: string
          id: string
          itinerary_item_id: string | null
          location_name: string | null
          num_adults: number
          num_children: number
          num_pax: number | null
          service_fee: number
          special_requests: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          total_amount: number
          trip_id: string | null
          unit_price: number
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          booking_date: string
          cancellation_reason?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          experience_id: string
          experience_slug: string
          experience_title: string
          id?: string
          itinerary_item_id?: string | null
          location_name?: string | null
          num_adults?: number
          num_children?: number
          num_pax?: number | null
          service_fee?: number
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          total_amount: number
          trip_id?: string | null
          unit_price: number
          updated_at?: string
          user_id: string
          vendor_name: string
        }
        Update: {
          booking_date?: string
          cancellation_reason?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          experience_id?: string
          experience_slug?: string
          experience_title?: string
          id?: string
          itinerary_item_id?: string | null
          location_name?: string | null
          num_adults?: number
          num_children?: number
          num_pax?: number | null
          service_fee?: number
          special_requests?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          total_amount?: number
          trip_id?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      experience_categories: {
        Row: {
          category_id: string
          experience_id: string
        }
        Insert: {
          category_id: string
          experience_id: string
        }
        Update: {
          category_id?: string
          experience_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_categories_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          address: string | null
          availability: Json
          booking_leadtime_hours: number
          cancellation_policy: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          includes: string[]
          is_published: boolean
          is_sample: boolean
          languages: string[]
          lat: number | null
          lng: number | null
          location_id: string | null
          max_pax: number
          meeting_point: string | null
          min_pax: number
          price_per_person: number
          rating: number | null
          review_count: number
          slug: string
          summary: string | null
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          address?: string | null
          availability?: Json
          booking_leadtime_hours?: number
          cancellation_policy?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          includes?: string[]
          is_published?: boolean
          is_sample?: boolean
          languages?: string[]
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          max_pax?: number
          meeting_point?: string | null
          min_pax?: number
          price_per_person?: number
          rating?: number | null
          review_count?: number
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          address?: string | null
          availability?: Json
          booking_leadtime_hours?: number
          cancellation_policy?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          includes?: string[]
          is_published?: boolean
          is_sample?: boolean
          languages?: string[]
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          max_pax?: number
          meeting_point?: string | null
          min_pax?: number
          price_per_person?: number
          rating?: number | null
          review_count?: number
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_primary: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["image_owner"]
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["image_owner"]
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["image_owner"]
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          created_at: string
          generated_by: Database["public"]["Enums"]["itinerary_source"]
          id: string
          is_current: boolean
          model: string | null
          request_summary: string | null
          trip_id: string
          version: number
        }
        Insert: {
          created_at?: string
          generated_by?: Database["public"]["Enums"]["itinerary_source"]
          id?: string
          is_current?: boolean
          model?: string | null
          request_summary?: string | null
          trip_id: string
          version?: number
        }
        Update: {
          created_at?: string
          generated_by?: Database["public"]["Enums"]["itinerary_source"]
          id?: string
          is_current?: boolean
          model?: string | null
          request_summary?: string | null
          trip_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          date: string | null
          day_number: number
          id: string
          itinerary_id: string
          summary: string | null
        }
        Insert: {
          date?: string | null
          day_number: number
          id?: string
          itinerary_id: string
          summary?: string | null
        }
        Update: {
          date?: string | null
          day_number?: number
          id?: string
          itinerary_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          attraction_id: string | null
          booking_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          estimated_cost: number
          experience_id: string | null
          id: string
          is_bookable: boolean
          item_type: Database["public"]["Enums"]["itinerary_item_type"]
          itinerary_day_id: string
          lat: number | null
          lng: number | null
          location_label: string | null
          sort_order: number
          start_time: string | null
          title: string
          why_recommended: string | null
        }
        Insert: {
          attraction_id?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          estimated_cost?: number
          experience_id?: string | null
          id?: string
          is_bookable?: boolean
          item_type: Database["public"]["Enums"]["itinerary_item_type"]
          itinerary_day_id: string
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
          why_recommended?: string | null
        }
        Update: {
          attraction_id?: string | null
          booking_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          estimated_cost?: number
          experience_id?: string | null
          id?: string
          is_bookable?: boolean
          item_type?: Database["public"]["Enums"]["itinerary_item_type"]
          itinerary_day_id?: string
          lat?: number | null
          lng?: number | null
          location_label?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          why_recommended?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          area: string | null
          created_at: string
          description: string | null
          id: string
          is_sample: boolean
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_ref: string | null
          raw_payload: Json
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider: string
          provider_payment_id?: string | null
          provider_ref?: string | null
          raw_payload?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_ref?: string | null
          raw_payload?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          experience_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          author_name: string
          comment: string
          created_at?: string
          experience_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          experience_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_total: number | null
          created_at: string
          currency: string
          destination: string
          end_date: string
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          interests: string[]
          notes: string | null
          num_adults: number
          num_children: number
          pace: Database["public"]["Enums"]["trip_pace"]
          start_date: string
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_total?: number | null
          created_at?: string
          currency?: string
          destination?: string
          end_date: string
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          interests?: string[]
          notes?: string | null
          num_adults?: number
          num_children?: number
          pace?: Database["public"]["Enums"]["trip_pace"]
          start_date: string
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_total?: number | null
          created_at?: string
          currency?: string
          destination?: string
          end_date?: string
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          interests?: string[]
          notes?: string | null
          num_adults?: number
          num_children?: number
          pace?: Database["public"]["Enums"]["trip_pace"]
          start_date?: string
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          avatar_url: string | null
          contact: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          is_sample: boolean
          lat: number | null
          lng: number | null
          location_id: string | null
          name: string
          slug: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          contact?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name: string
          slug: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          contact?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          is_sample?: boolean
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name?: string
          slug?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_trip: { Args: { p_itinerary: Json; p_trip: Json }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      save_itinerary: {
        Args: { p_itinerary: Json; p_trip_id: string }
        Returns: string
      }
      settle_payment: {
        Args: {
          p_amount: number
          p_expected_user?: string
          p_provider: string
          p_provider_payment_id?: string
          p_provider_ref: string
          p_raw?: Json
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: Json
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "refunded"
      group_type: "solo" | "couple" | "family" | "friends" | "business"
      image_owner: "attraction" | "vendor" | "experience"
      itinerary_item_type:
        | "attraction"
        | "experience"
        | "meal"
        | "transport"
        | "free_time"
      itinerary_source: "ai" | "user"
      payment_method: "fpx" | "card" | "ewallet" | "mock"
      payment_status:
        | "created"
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled"
      trip_pace: "relaxed" | "moderate" | "packed"
      trip_status: "draft" | "planned" | "booked" | "completed" | "archived"
      user_role: "tourist" | "admin"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
      ],
      group_type: ["solo", "couple", "family", "friends", "business"],
      image_owner: ["attraction", "vendor", "experience"],
      itinerary_item_type: [
        "attraction",
        "experience",
        "meal",
        "transport",
        "free_time",
      ],
      itinerary_source: ["ai", "user"],
      payment_method: ["fpx", "card", "ewallet", "mock"],
      payment_status: [
        "created",
        "pending",
        "paid",
        "failed",
        "refunded",
        "cancelled",
      ],
      trip_pace: ["relaxed", "moderate", "packed"],
      trip_status: ["draft", "planned", "booked", "completed", "archived"],
      user_role: ["tourist", "admin"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
