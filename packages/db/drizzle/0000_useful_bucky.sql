CREATE TYPE "public"."activity_type" AS ENUM('email_sent', 'email_received', 'call_completed', 'meeting_scheduled', 'meeting_completed', 'note_added', 'stage_changed', 'task_completed', 'document_shared');--> statement-breakpoint
CREATE TYPE "public"."agent_action_type" AS ENUM('email_drafted', 'lead_scored', 'research_generated', 'transcript_analyzed', 'deal_stage_recommended', 'meeting_scheduled', 'feedback_processed', 'instruction_updated');--> statement-breakpoint
CREATE TYPE "public"."agent_role_type" AS ENUM('ae', 'bdr', 'sa', 'csm', 'manager');--> statement-breakpoint
CREATE TYPE "public"."config_changed_by" AS ENUM('user', 'ai', 'feedback_loop');--> statement-breakpoint
CREATE TYPE "public"."contact_role" AS ENUM('champion', 'economic_buyer', 'technical_evaluator', 'end_user', 'blocker', 'coach');--> statement-breakpoint
CREATE TYPE "public"."email_sequence_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."email_step_status" AS ENUM('draft', 'approved', 'sent', 'opened', 'clicked', 'replied', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."enrichment_source" AS ENUM('apollo', 'clearbit', 'simulated');--> statement-breakpoint
CREATE TYPE "public"."feedback_request_type" AS ENUM('add_info', 'change_format', 'add_question', 'remove_field', 'process_change');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('pending', 'approved', 'rejected', 'auto_applied');--> statement-breakpoint
CREATE TYPE "public"."field_query_question_status" AS ENUM('pending', 'answered', 'skipped', 'expired');--> statement-breakpoint
CREATE TYPE "public"."field_query_status" AS ENUM('active', 'answered', 'expired');--> statement-breakpoint
CREATE TYPE "public"."forecast_category" AS ENUM('pipeline', 'upside', 'commit', 'closed');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('inbound', 'outbound', 'plg_upgrade', 'partner', 'event');--> statement-breakpoint
CREATE TYPE "public"."milestone_source" AS ENUM('manual', 'transcript', 'email', 'ai_detected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('deal_at_risk', 'handoff_request', 'agent_recommendation', 'feedback_received', 'stage_change', 'meeting_reminder', 'approval_needed', 'system_intelligence');--> statement-breakpoint
CREATE TYPE "public"."observation_routing_status" AS ENUM('sent', 'acknowledged', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('new_lead', 'qualified', 'discovery', 'technical_validation', 'proposal', 'negotiation', 'closing', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."product" AS ENUM('claude_api', 'claude_enterprise', 'claude_team');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('AE', 'BDR', 'SA', 'CSM', 'MANAGER');--> statement-breakpoint
CREATE TYPE "public"."stage_changed_by" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."transcript_source" AS ENUM('uploaded', 'recorded', 'simulated');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('pending', 'transcribing', 'analyzing', 'complete');--> statement-breakpoint
CREATE TYPE "public"."vertical" AS ENUM('healthcare', 'financial_services', 'manufacturing', 'retail', 'technology', 'general');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"contact_id" uuid,
	"team_member_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"subject" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_actions_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_config_id" uuid NOT NULL,
	"action_type" "agent_action_type" NOT NULL,
	"description" text,
	"input_data" jsonb,
	"output_data" jsonb,
	"was_overridden" boolean DEFAULT false,
	"override_reason" text,
	"deal_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_config_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_config_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"instructions" text NOT NULL,
	"output_preferences" jsonb,
	"changed_by" "config_changed_by" NOT NULL,
	"change_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"role_type" "agent_role_type" NOT NULL,
	"instructions" text NOT NULL,
	"output_preferences" jsonb,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcript_id" uuid NOT NULL,
	"summary" text,
	"pain_points" jsonb,
	"next_steps" jsonb,
	"stakeholders_mentioned" jsonb,
	"budget_signals" jsonb,
	"competitive_mentions" jsonb,
	"talk_ratio" jsonb,
	"question_quality" jsonb,
	"call_quality_score" integer,
	"meddpicc_extractions" jsonb,
	"coaching_insights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"duration_seconds" integer,
	"participants" jsonb,
	"transcript_text" text,
	"source" "transcript_source" DEFAULT 'simulated',
	"status" "transcript_status" DEFAULT 'complete',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" "vertical" NOT NULL,
	"employee_count" integer,
	"annual_revenue" text,
	"tech_stack" text[],
	"hq_location" text,
	"description" text,
	"enrichment_source" "enrichment_source" DEFAULT 'simulated',
	"enrichment_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"linkedin_url" text,
	"company_id" uuid NOT NULL,
	"role_in_deal" "contact_role",
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"milestone_key" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"source" "milestone_source" DEFAULT 'manual',
	"evidence" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_stage" "pipeline_stage",
	"to_stage" "pipeline_stage" NOT NULL,
	"changed_by" "stage_changed_by" NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" uuid NOT NULL,
	"primary_contact_id" uuid,
	"assigned_ae_id" uuid,
	"assigned_bdr_id" uuid,
	"assigned_sa_id" uuid,
	"stage" "pipeline_stage" DEFAULT 'new_lead' NOT NULL,
	"deal_value" numeric(12, 2),
	"currency" text DEFAULT 'EUR',
	"close_date" timestamp,
	"win_probability" integer DEFAULT 0,
	"forecast_category" "forecast_category" DEFAULT 'pipeline',
	"vertical" "vertical" NOT NULL,
	"product" "product",
	"lead_source" "lead_source",
	"competitor" text,
	"loss_reason" text,
	"stage_entered_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"assigned_ae_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "email_sequence_status" DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"delay_days" integer DEFAULT 0,
	"status" "email_step_status" DEFAULT 'draft',
	"sent_at" timestamp,
	"opened_at" timestamp,
	"replied_at" timestamp,
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_member_id" uuid NOT NULL,
	"from_agent_config_id" uuid NOT NULL,
	"target_role_type" "agent_role_type" NOT NULL,
	"description" text NOT NULL,
	"request_type" "feedback_request_type" NOT NULL,
	"status" "feedback_status" DEFAULT 'pending',
	"priority" "priority" DEFAULT 'medium',
	"approved_by_member_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiated_by" uuid NOT NULL,
	"raw_question" text NOT NULL,
	"ai_analysis" jsonb,
	"cluster_id" uuid,
	"aggregated_answer" jsonb,
	"status" "field_query_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_query_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_id" uuid NOT NULL,
	"target_member_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"chips" text[] NOT NULL,
	"deal_id" uuid,
	"account_id" uuid,
	"response_text" text,
	"response_type" text,
	"responded_at" timestamp,
	"give_back" jsonb,
	"records_updated" jsonb,
	"status" "field_query_question_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"deal_id" uuid,
	"score" integer DEFAULT 0,
	"scoring_factors" jsonb,
	"icp_match_pct" integer DEFAULT 0,
	"engagement_score" integer DEFAULT 0,
	"intent_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meddpicc_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"metrics" text,
	"metrics_confidence" integer DEFAULT 0,
	"economic_buyer" text,
	"economic_buyer_confidence" integer DEFAULT 0,
	"decision_criteria" text,
	"decision_criteria_confidence" integer DEFAULT 0,
	"decision_process" text,
	"decision_process_confidence" integer DEFAULT 0,
	"identify_pain" text,
	"identify_pain_confidence" integer DEFAULT 0,
	"champion" text,
	"champion_confidence" integer DEFAULT 0,
	"competition" text,
	"competition_confidence" integer DEFAULT 0,
	"ai_extracted" boolean DEFAULT true,
	"ae_confirmed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"deal_id" uuid,
	"is_read" boolean DEFAULT false,
	"priority" "priority" DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"signal_type" text NOT NULL,
	"target_function" text,
	"observation_count" integer DEFAULT 1,
	"observer_count" integer DEFAULT 1,
	"verticals_affected" text[],
	"pipeline_impact" jsonb,
	"severity" text DEFAULT 'informational',
	"resolution_status" text DEFAULT 'emerging',
	"resolution_notes" text,
	"effectiveness_score" integer,
	"arr_impact_total" numeric(12, 2),
	"arr_impact_details" jsonb,
	"unstructured_quotes" jsonb,
	"structured_summary" jsonb,
	"first_observed" timestamp DEFAULT now(),
	"last_observed" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observation_id" uuid NOT NULL,
	"target_function" text NOT NULL,
	"target_member_id" uuid,
	"signal_type" text NOT NULL,
	"status" "observation_routing_status" DEFAULT 'sent' NOT NULL,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observer_id" uuid NOT NULL,
	"raw_input" text NOT NULL,
	"source_context" jsonb,
	"ai_classification" jsonb,
	"ai_giveback" jsonb,
	"status" text DEFAULT 'submitted',
	"lifecycle_events" jsonb,
	"cluster_id" uuid,
	"follow_up_question" text,
	"follow_up_response" text,
	"follow_up_chips" text[],
	"structured_data" jsonb,
	"arr_impact" jsonb,
	"linked_account_ids" uuid[],
	"linked_deal_ids" uuid[],
	"extracted_entities" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"verticals" text[],
	"tags" text[],
	"url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_function_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"function" text NOT NULL,
	"email" text,
	"avatar_initials" text,
	"avatar_color" text,
	"verticals_covered" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "role" NOT NULL,
	"vertical_specialization" "vertical" DEFAULT 'general' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"capacity_target" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions_log" ADD CONSTRAINT "agent_actions_log_agent_config_id_agent_configs_id_fk" FOREIGN KEY ("agent_config_id") REFERENCES "public"."agent_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions_log" ADD CONSTRAINT "agent_actions_log_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_config_versions" ADD CONSTRAINT "agent_config_versions_agent_config_id_agent_configs_id_fk" FOREIGN KEY ("agent_config_id") REFERENCES "public"."agent_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_analyses" ADD CONSTRAINT "call_analyses_transcript_id_call_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."call_transcripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestones" ADD CONSTRAINT "deal_milestones_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_ae_id_team_members_id_fk" FOREIGN KEY ("assigned_ae_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_bdr_id_team_members_id_fk" FOREIGN KEY ("assigned_bdr_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_sa_id_team_members_id_fk" FOREIGN KEY ("assigned_sa_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_assigned_ae_id_team_members_id_fk" FOREIGN KEY ("assigned_ae_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_steps" ADD CONSTRAINT "email_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_from_member_id_team_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_from_agent_config_id_agent_configs_id_fk" FOREIGN KEY ("from_agent_config_id") REFERENCES "public"."agent_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_approved_by_member_id_team_members_id_fk" FOREIGN KEY ("approved_by_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_queries" ADD CONSTRAINT "field_queries_cluster_id_observation_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."observation_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_query_questions" ADD CONSTRAINT "field_query_questions_query_id_field_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."field_queries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_query_questions" ADD CONSTRAINT "field_query_questions_target_member_id_team_members_id_fk" FOREIGN KEY ("target_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_query_questions" ADD CONSTRAINT "field_query_questions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_query_questions" ADD CONSTRAINT "field_query_questions_account_id_companies_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meddpicc_fields" ADD CONSTRAINT "meddpicc_fields_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_routing" ADD CONSTRAINT "observation_routing_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_observer_id_team_members_id_fk" FOREIGN KEY ("observer_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_cluster_id_observation_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."observation_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "call_analyses_transcript_id_idx" ON "call_analyses" USING btree ("transcript_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meddpicc_deal_id_idx" ON "meddpicc_fields" USING btree ("deal_id");