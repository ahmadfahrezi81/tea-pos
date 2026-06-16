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
      payroll_claim_eligibility: {
        Row: {
          claim_type_id: string
          created_at: string | null
          id: string
          removed_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          claim_type_id: string
          created_at?: string | null
          id?: string
          removed_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          claim_type_id?: string
          created_at?: string | null
          id?: string
          removed_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_claim_eligibility_claim_type_id_fkey"
            columns: ["claim_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_claim_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claim_eligibility_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claim_eligibility_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_claim_types: {
        Row: {
          amount: number
          created_at: string | null
          frequency: string
          id: string
          is_enabled: boolean
          name: string
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          frequency: string
          id?: string
          is_enabled?: boolean
          name: string
          slug: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_claim_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_claims: {
        Row: {
          amount: number
          claim_type_id: string | null
          created_at: string
          date: string
          frequency: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_proof_url: string | null
          payroll_period_id: string
          photo_url: string | null
          status: string
          store_id: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          claim_type_id?: string | null
          created_at?: string
          date: string
          frequency?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payroll_period_id: string
          photo_url?: string | null
          status?: string
          store_id?: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          claim_type_id?: string | null
          created_at?: string
          date?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payroll_period_id?: string
          photo_url?: string | null
          status?: string
          store_id?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_claims_claim_type_id_fkey"
            columns: ["claim_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_claim_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claims_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claims_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claims_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_commission_types: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          name: string
          rate_per_cup: number
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          rate_per_cup?: number
          slug: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          rate_per_cup?: number
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_commission_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_commissions: {
        Row: {
          commission_type_id: string | null
          created_at: string | null
          daily_summary_id: string
          date: string
          gross_pay: number
          id: string
          payroll_period_id: string
          rate_per_cup: number
          status: string
          store_id: string
          tenant_id: string
          total_cups: number
          user_id: string
        }
        Insert: {
          commission_type_id?: string | null
          created_at?: string | null
          daily_summary_id: string
          date: string
          gross_pay: number
          id?: string
          payroll_period_id: string
          rate_per_cup: number
          status?: string
          store_id: string
          tenant_id: string
          total_cups?: number
          user_id: string
        }
        Update: {
          commission_type_id?: string | null
          created_at?: string | null
          daily_summary_id?: string
          date?: string
          gross_pay?: number
          id?: string
          payroll_period_id?: string
          rate_per_cup?: number
          status?: string
          store_id?: string
          tenant_id?: string
          total_cups?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_commissions_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_commission_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_commissions_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_commissions_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_commissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payouts: {
        Row: {
          claims_total: number
          commissions_total: number
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_proof_url: string | null
          payroll_period_id: string
          status: string
          tenant_id: string
          total_pay: number
          user_id: string
        }
        Insert: {
          claims_total?: number
          commissions_total?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payroll_period_id: string
          status?: string
          tenant_id: string
          total_pay?: number
          user_id: string
        }
        Update: {
          claims_total?: number
          commissions_total?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_proof_url?: string | null
          payroll_period_id?: string
          status?: string
          tenant_id?: string
          total_pay?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payouts_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          start_date: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_user_info: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          commission_type_id: string | null
          created_at: string | null
          id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          commission_type_id?: string | null
          created_at?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          commission_type_id?: string | null
          created_at?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_user_info_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_commission_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_user_info_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_user_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_daily_summaries: {
        Row: {
          actual_cash: number | null
          closed_at: string | null
          closed_by: string | null
          closing_cash_breakdown: Json | null
          created_at: string | null
          date: string
          expected_cash: number
          id: string
          notes: string | null
          opened_by: string
          opening_balance: number
          opening_cash_breakdown: Json | null
          store_id: string
          tenant_id: string | null
          total_cups: number
          total_expenses: number
          total_orders: number
          total_sales: number
          variance: number | null
        }
        Insert: {
          actual_cash?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_breakdown?: Json | null
          created_at?: string | null
          date: string
          expected_cash?: number
          id?: string
          notes?: string | null
          opened_by: string
          opening_balance?: number
          opening_cash_breakdown?: Json | null
          store_id: string
          tenant_id?: string | null
          total_cups?: number
          total_expenses?: number
          total_orders?: number
          total_sales?: number
          variance?: number | null
        }
        Update: {
          actual_cash?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closing_cash_breakdown?: Json | null
          created_at?: string | null
          date?: string
          expected_cash?: number
          id?: string
          notes?: string | null
          opened_by?: string
          opening_balance?: number
          opening_cash_breakdown?: Json | null
          store_id?: string
          tenant_id?: string | null
          total_cups?: number
          total_expenses?: number
          total_orders?: number
          total_sales?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_daily_summary_photos: {
        Row: {
          created_at: string | null
          daily_summary_id: string | null
          expense_id: string | null
          id: string
          quantity: Json | null
          store_id: string
          tenant_id: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          daily_summary_id?: string | null
          expense_id?: string | null
          id?: string
          quantity?: Json | null
          store_id: string
          tenant_id?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          daily_summary_id?: string | null
          expense_id?: string | null
          id?: string
          quantity?: Json | null
          store_id?: string
          tenant_id?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_photos_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summary_photos_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "store_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summary_photos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_summary_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_expenses: {
        Row: {
          amount: number
          created_at: string
          daily_summary_id: string
          id: string
          notes: string | null
          photo_url: string | null
          store_id: string
          tenant_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          daily_summary_id: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          store_id: string
          tenant_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          daily_summary_id?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          store_id?: string
          tenant_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          tenant_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          tenant_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "tenant_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_payments: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          pending_items: Json | null
          qr_string: string
          status: string
          store_id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          xendit_qr_id: string
          xendit_reference_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          pending_items?: Json | null
          qr_string: string
          status?: string
          store_id: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          xendit_qr_id: string
          xendit_reference_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          pending_items?: Json | null
          qr_string?: string
          status?: string
          store_id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          xendit_qr_id?: string
          xendit_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string | null
          id: string
          payment_method: string
          store_id: string
          tenant_id: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_method?: string
          store_id: string
          tenant_id?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_method?: string
          store_id?: string
          tenant_id?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reports: {
        Row: {
          created_at: string
          daily_summary_id: string | null
          id: string
          notes: string
          photo_url: string | null
          store_id: string
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_summary_id?: string | null
          id?: string
          notes: string
          photo_url?: string | null
          store_id: string
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_summary_id?: string | null
          id?: string
          notes?: string
          photo_url?: string | null
          store_id?: string
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requests: {
        Row: {
          created_at: string
          daily_summary_id: string | null
          id: string
          notes: string | null
          photo_url: string | null
          store_id: string
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_summary_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          store_id: string
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_summary_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          store_id?: string
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_requests_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sessions: {
        Row: {
          claim_code: string
          created_at: string | null
          daily_summary_id: string
          ended_at: string | null
          id: string
          previous_session_id: string | null
          started_at: string
          status: string
          store_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          claim_code: string
          created_at?: string | null
          daily_summary_id: string
          ended_at?: string | null
          id?: string
          previous_session_id?: string | null
          started_at?: string
          status?: string
          store_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          claim_code?: string
          created_at?: string | null
          daily_summary_id?: string
          ended_at?: string | null
          id?: string
          previous_session_id?: string | null
          started_at?: string
          status?: string
          store_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_sessions_daily_summary_id_fkey"
            columns: ["daily_summary_id"]
            isOneToOne: false
            referencedRelation: "store_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sessions_previous_session_id_fkey"
            columns: ["previous_session_id"]
            isOneToOne: false
            referencedRelation: "store_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          close_time: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          open_time: string
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          close_time?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          open_time?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          close_time?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          open_time?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_activity_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          ref_id: string | null
          ref_table: string | null
          store_id: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          store_id?: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          store_id?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_customer_feedbacks: {
        Row: {
          created_at: string
          id: string
          latitude: number
          location_display: string
          location_name: string
          longitude: number
          notes: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          location_display: string
          location_name: string
          longitude: number
          notes?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          location_display?: string
          location_name?: string
          longitude?: number
          notes?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedbacks_seller_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_product_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_products: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean | null
          name: string
          popularity_rank: number | null
          price: number
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name: string
          popularity_rank?: number | null
          price: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          popularity_rank?: number | null
          price?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tenant_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_store_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_assignments: {
        Row: {
          created_at: string | null
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone_number: string | null
          preferred_language: string
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone_number?: string | null
          preferred_language?: string
          role: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          preferred_language?: string
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      weather_hourly: {
        Row: {
          city: string
          created_at: string
          date: string
          fetched_at: string
          hour: number
          id: string
          lat: number
          lng: number
          precipitation_probability: number
          region: string
          temperature: number
          weather_code: number
        }
        Insert: {
          city: string
          created_at?: string
          date: string
          fetched_at?: string
          hour: number
          id?: string
          lat: number
          lng: number
          precipitation_probability: number
          region: string
          temperature: number
          weather_code: number
        }
        Update: {
          city?: string
          created_at?: string
          date?: string
          fetched_at?: string
          hour?: number
          id?: string
          lat?: number
          lng?: number
          precipitation_probability?: number
          region?: string
          temperature?: number
          weather_code?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      payroll_claims_month_key: { Args: { d: string }; Returns: string }
      user_tenant_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
