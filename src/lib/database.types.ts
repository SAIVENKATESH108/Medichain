export type OrgRole = 'owner' | 'admin' | 'pharmacist' | 'regulator' | 'manufacturer' | 'member';
export type ReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'amended';
export type SubmissionStatus = 'draft' | 'internal_reviewed' | 'ready_for_external_filing' | 'archived';
export type ModelProvider = 'gemini' | 'openrouter' | 'mock' | 'custom';
export type VerificationVerdict = 'VERIFIED' | 'SUSPICIOUS' | 'COUNTERFEIT';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tier: 'standard' | 'enterprise' | 'regulator';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          tier?: 'standard' | 'enterprise' | 'regulator';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrgRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          organization: string | null;
          role: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          organization?: string | null;
          role?: string;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          organization?: string | null;
          role?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      verifications: {
        Row: {
          id: string;
          user_id: string;
          report_id: string;
          medicine_name: string;
          batch_number: string | null;
          manufacturer: string;
          expiry_date: string | null;
          country: string | null;
          image_url: string | null;
          verdict: VerificationVerdict;
          confidence: number;
          risk_score: number;
          summary: string | null;
          visual_analysis: Record<string, unknown> | null;
          supply_chain_check: Record<string, unknown> | null;
          batch_verification: Record<string, unknown> | null;
          recommendations: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_id: string;
          medicine_name: string;
          batch_number?: string | null;
          manufacturer: string;
          expiry_date?: string | null;
          country?: string | null;
          image_url?: string | null;
          verdict: VerificationVerdict;
          confidence: number;
          risk_score: number;
          summary?: string | null;
          visual_analysis?: Record<string, unknown> | null;
          supply_chain_check?: Record<string, unknown> | null;
          batch_verification?: Record<string, unknown> | null;
          recommendations?: string[] | null;
        };
        Update: Partial<Database['public']['Tables']['verifications']['Insert']>;
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      drug_schedules: {
        Row: {
          id: string;
          schedule: string;
          title: string;
          description: string;
          requires_prescription: boolean;
          mandatory_warning_label: string;
          gsr_reference: string | null;
          sample_drugs: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          schedule: string;
          title: string;
          description: string;
          requires_prescription?: boolean;
          mandatory_warning_label: string;
          gsr_reference?: string | null;
          sample_drugs?: string[] | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['drug_schedules']['Insert']>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          email_alerts: boolean;
          sms_alerts: boolean;
          weekly_digest: boolean;
          webhook_url: string | null;
          blockchain_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_alerts?: boolean;
          sms_alerts?: boolean;
          weekly_digest?: boolean;
          webhook_url?: string | null;
          blockchain_enabled?: boolean;
        };
        Update: {
          email_alerts?: boolean;
          sms_alerts?: boolean;
          weekly_digest?: boolean;
          webhook_url?: string | null;
          blockchain_enabled?: boolean;
          updated_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          alert_code: string;
          medicine: string;
          manufacturer: string | null;
          batch: string | null;
          region: string | null;
          risk_level: 'High' | 'Medium' | 'Low';
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alert_code: string;
          medicine: string;
          manufacturer?: string | null;
          batch?: string | null;
          region?: string | null;
          risk_level: 'High' | 'Medium' | 'Low';
          description?: string | null;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
      api_keys: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: string[];
          rate_limit_rpm: number;
          created_by: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes?: string[];
          rate_limit_rpm?: number;
          created_by?: string | null;
          revoked_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>;
      };
      openfda_cache: {
        Row: {
          cache_key: string;
          query_type: 'ndc_lookup' | 'recalls' | 'manufacturer';
          medicine_query: string;
          response_data: Record<string, unknown>;
          status_code: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          cache_key: string;
          query_type: 'ndc_lookup' | 'recalls' | 'manufacturer';
          medicine_query: string;
          response_data: Record<string, unknown>;
          status_code?: number;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['openfda_cache']['Insert']>;
      };
      indian_medicines_master: {
        Row: {
          id: string;
          medicine_id: number;
          name: string;
          price: number | null;
          is_discontinued: boolean;
          manufacturer_name: string;
          manufacturing_location: string | null;
          supplier_name: string | null;
          country_of_origin: string;
          regulatory_agency: string;
          category: string;
          type: string;
          pack_size_label: string | null;
          short_composition1: string | null;
          short_composition2: string | null;
          active_composition: string | null;
          schedule: string;
          cdsco_approved: boolean;
          nlem_listed: boolean;
          who_prequalified: boolean;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          medicine_id: number;
          name: string;
          price?: number | null;
          is_discontinued?: boolean;
          manufacturer_name: string;
          manufacturing_location?: string | null;
          supplier_name?: string | null;
          country_of_origin?: string;
          regulatory_agency?: string;
          category?: string;
          type?: string;
          pack_size_label?: string | null;
          short_composition1?: string | null;
          short_composition2?: string | null;
          active_composition?: string | null;
          schedule?: string;
          cdsco_approved?: boolean;
          nlem_listed?: boolean;
          who_prequalified?: boolean;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['indian_medicines_master']['Insert']>;
      };
      global_medicines_directory: {
        Row: {
          id: string;
          code: string;
          brand_name: string;
          generic_name: string;
          dosage_form: string | null;
          strength: string | null;
          manufacturer_name: string;
          supplier_distributor: string | null;
          country_of_origin: string;
          manufacturing_facility: string | null;
          regulatory_authority: string;
          category: string;
          schedule: string;
          price_local: number | null;
          currency: string;
          who_prequalified: boolean;
          source_portal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          brand_name: string;
          generic_name: string;
          dosage_form?: string | null;
          strength?: string | null;
          manufacturer_name: string;
          supplier_distributor?: string | null;
          country_of_origin: string;
          manufacturing_facility?: string | null;
          regulatory_authority: string;
          category?: string;
          schedule?: string;
          price_local?: number | null;
          currency?: string;
          who_prequalified?: boolean;
          source_portal: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['global_medicines_directory']['Insert']>;
      };
      pharma_manufacturers_suppliers: {
        Row: {
          id: string;
          company_name: string;
          entity_type: 'Manufacturer' | 'Supplier / Distributor' | 'API Producer' | 'Government Ayush Kendra';
          country: string;
          headquarters: string;
          facilities_locations: string[];
          gmp_certified: boolean;
          who_prequalified: boolean;
          primary_regulatory_license: string;
          authorized_agencies: string[];
          export_jurisdictions: string[];
          supply_chain_tier: string;
          established_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          entity_type: 'Manufacturer' | 'Supplier / Distributor' | 'API Producer' | 'Government Ayush Kendra';
          country: string;
          headquarters: string;
          facilities_locations: string[];
          gmp_certified?: boolean;
          who_prequalified?: boolean;
          primary_regulatory_license: string;
          authorized_agencies: string[];
          export_jurisdictions: string[];
          supply_chain_tier: string;
          established_year?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pharma_manufacturers_suppliers']['Insert']>;
      };
      ai_model_routing_log: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          task_type: 'content_safety' | 'vision_analysis' | 'database_crossref' | 'risk_assessment' | 'chat_assistant';
          provider: ModelProvider;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          latency_ms: number;
          cost_estimate_usd: number;
          fallback_triggered: boolean;
          fallback_reason: string | null;
          status: 'success' | 'rate_limited' | 'provider_error' | 'fallback_success' | 'guardrail_blocked';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          task_type: 'content_safety' | 'vision_analysis' | 'database_crossref' | 'risk_assessment' | 'chat_assistant';
          provider: ModelProvider;
          model: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms: number;
          cost_estimate_usd?: number;
          fallback_triggered?: boolean;
          fallback_reason?: string | null;
          status: 'success' | 'rate_limited' | 'provider_error' | 'fallback_success' | 'guardrail_blocked';
        };
        Update: Partial<Database['public']['Tables']['ai_model_routing_log']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          sequence_number: number;
          organization_id: string | null;
          user_id: string | null;
          event_type: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          canonical_payload: Record<string, unknown>;
          previous_hash: string;
          current_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sequence_number?: number;
          organization_id?: string | null;
          user_id?: string | null;
          event_type: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          canonical_payload: Record<string, unknown>;
          previous_hash: string;
          current_hash: string;
          created_at?: string;
        };
        Update: never; // Immutable
      };
      manufacturer_registry: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          license_number: string | null;
          country: string;
          is_who_prequalified: boolean;
          cdsco_approved: boolean;
          risk_rating: 'Low' | 'Medium' | 'High' | 'Critical';
          registered_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          normalized_name: string;
          license_number?: string | null;
          country?: string;
          is_who_prequalified?: boolean;
          cdsco_approved?: boolean;
          risk_rating?: 'Low' | 'Medium' | 'High' | 'Critical';
          registered_address?: string | null;
        };
        Update: Partial<Database['public']['Tables']['manufacturer_registry']['Insert']>;
      };
      review_queue: {
        Row: {
          id: string;
          organization_id: string | null;
          verification_id: string | null;
          report_id: string;
          medicine_name: string;
          manufacturer: string;
          batch_number: string | null;
          draft_type: 'quarantine_order' | 'cdsco_form_19' | 'compliance_escalation' | 'batch_recall';
          draft_title: string;
          draft_content: string;
          risk_score: number;
          status: ReviewStatus;
          reviewed_by: string | null;
          reviewer_role: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          verification_id?: string | null;
          report_id: string;
          medicine_name: string;
          manufacturer: string;
          batch_number?: string | null;
          draft_type: 'quarantine_order' | 'cdsco_form_19' | 'compliance_escalation' | 'batch_recall';
          draft_title: string;
          draft_content: string;
          risk_score: number;
          status?: ReviewStatus;
          reviewed_by?: string | null;
          reviewer_role?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['review_queue']['Insert']>;
      };
      regulatory_submissions: {
        Row: {
          id: string;
          organization_id: string | null;
          review_id: string;
          report_id: string;
          form_type: string;
          filing_status: SubmissionStatus;
          authority_target: string;
          docket_reference_number: string | null;
          submitted_by_user_id: string | null;
          submission_notes: string | null;
          signed_off_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          review_id: string;
          report_id: string;
          form_type?: string;
          filing_status?: SubmissionStatus;
          authority_target?: string;
          docket_reference_number?: string | null;
          submitted_by_user_id?: string | null;
          submission_notes?: string | null;
          signed_off_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['regulatory_submissions']['Insert']>;
      };
      notification_log: {
        Row: {
          id: string;
          organization_id: string | null;
          recipient_type: 'email' | 'sms' | 'webhook' | 'in_app';
          recipient_target: string;
          event_type: string;
          status: 'queued' | 'sent' | 'failed' | 'delivered';
          payload: Record<string, unknown>;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          recipient_type: 'email' | 'sms' | 'webhook' | 'in_app';
          recipient_target: string;
          event_type: string;
          status?: 'queued' | 'sent' | 'failed' | 'delivered';
          payload: Record<string, unknown>;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notification_log']['Insert']>;
      };
      feedback: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string;
          verification_id: string | null;
          rating: number;
          feedback_category: 'accuracy' | 'ui' | 'speed' | 'compliance' | 'other';
          comments: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id: string;
          verification_id?: string | null;
          rating: number;
          feedback_category: 'accuracy' | 'ui' | 'speed' | 'compliance' | 'other';
          comments?: string | null;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
      };
    };
  };
}

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Verification = Database['public']['Tables']['verifications']['Row'];
export type VerificationInsert = Database['public']['Tables']['verifications']['Insert'];
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type Alert = Database['public']['Tables']['alerts']['Row'];
export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type OpenFDACacheRow = Database['public']['Tables']['openfda_cache']['Row'];
export type AiModelRoutingLogRow = Database['public']['Tables']['ai_model_routing_log']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];
export type ManufacturerRegistryRow = Database['public']['Tables']['manufacturer_registry']['Row'];
export type ReviewQueueRow = Database['public']['Tables']['review_queue']['Row'];
export type RegulatorySubmissionRow = Database['public']['Tables']['regulatory_submissions']['Row'];
export type NotificationLogRow = Database['public']['Tables']['notification_log']['Row'];
export type FeedbackRow = Database['public']['Tables']['feedback']['Row'];
