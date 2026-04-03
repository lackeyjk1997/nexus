CREATE TABLE "account_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"health_score" integer DEFAULT 80,
	"health_trend" text DEFAULT 'stable',
	"health_factors" jsonb,
	"contract_status" text NOT NULL,
	"contract_start" timestamp,
	"renewal_date" timestamp,
	"arr" numeric(12, 2),
	"products_purchased" text[],
	"usage_metrics" jsonb,
	"last_touch_date" timestamp,
	"days_since_touch" integer,
	"key_stakeholders" jsonb,
	"expansion_signals" jsonb,
	"risk_signals" jsonb,
	"next_qbr_date" timestamp,
	"onboarding_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"channel" text NOT NULL,
	"received_at" timestamp NOT NULL,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"response_kit" jsonb,
	"responded_at" timestamp,
	"response_text" text,
	"ai_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "influence_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"vertical" text,
	"score" integer DEFAULT 0,
	"tier" text DEFAULT 'contributing',
	"attributions" jsonb,
	"last_contribution_at" timestamp,
	"decay_applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"article_type" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"products" text[],
	"verticals" text[],
	"tags" text[],
	"resolution_steps" jsonb,
	"related_company_ids" uuid[],
	"effectiveness_score" integer,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"originator_id" uuid NOT NULL,
	"originated_from" text,
	"source_observation_id" uuid,
	"title" text NOT NULL,
	"hypothesis" text NOT NULL,
	"category" text NOT NULL,
	"vertical" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"test_start_date" timestamp,
	"test_end_date" timestamp,
	"test_group_deals" text[],
	"control_group_deals" text[],
	"results" jsonb,
	"followers" text[],
	"follower_count" integer DEFAULT 0,
	"test_group" text[],
	"control_group" text[],
	"success_thresholds" jsonb,
	"current_metrics" jsonb,
	"approved_by" text,
	"approved_at" timestamp,
	"graduated_at" timestamp,
	"experiment_duration_days" integer DEFAULT 30,
	"experiment_start" timestamp,
	"experiment_end" timestamp,
	"attribution" jsonb,
	"experiment_evidence" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_health" ADD CONSTRAINT "account_health_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_health" ADD CONSTRAINT "account_health_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influence_scores" ADD CONSTRAINT "influence_scores_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_ideas" ADD CONSTRAINT "playbook_ideas_originator_id_team_members_id_fk" FOREIGN KEY ("originator_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_ideas" ADD CONSTRAINT "playbook_ideas_source_observation_id_observations_id_fk" FOREIGN KEY ("source_observation_id") REFERENCES "public"."observations"("id") ON DELETE no action ON UPDATE no action;