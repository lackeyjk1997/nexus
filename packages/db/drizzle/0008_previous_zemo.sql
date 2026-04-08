CREATE TABLE "deal_fitness_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"fit_category" text NOT NULL,
	"event_key" text NOT NULL,
	"event_label" text NOT NULL,
	"event_description" text,
	"status" text DEFAULT 'not_yet' NOT NULL,
	"detected_at" timestamp,
	"lifecycle_phase" text DEFAULT 'pre_sale' NOT NULL,
	"detection_sources" text[],
	"source_references" jsonb,
	"evidence_snippets" jsonb,
	"confidence" numeric(3, 2),
	"detected_by" text DEFAULT 'ai',
	"contact_id" uuid,
	"contact_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_fitness_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"business_fit_score" integer DEFAULT 0,
	"business_fit_detected" integer DEFAULT 0,
	"business_fit_total" integer DEFAULT 0,
	"emotional_fit_score" integer DEFAULT 0,
	"emotional_fit_detected" integer DEFAULT 0,
	"emotional_fit_total" integer DEFAULT 0,
	"technical_fit_score" integer DEFAULT 0,
	"technical_fit_detected" integer DEFAULT 0,
	"technical_fit_total" integer DEFAULT 0,
	"readiness_fit_score" integer DEFAULT 0,
	"readiness_fit_detected" integer DEFAULT 0,
	"readiness_fit_total" integer DEFAULT 0,
	"overall_fitness" integer DEFAULT 0,
	"velocity_trend" text DEFAULT 'stable',
	"last_event_at" timestamp,
	"days_since_last_event" integer,
	"fit_imbalance_flag" boolean DEFAULT false,
	"events_this_week" integer DEFAULT 0,
	"events_last_week" integer DEFAULT 0,
	"benchmark_vs_won" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_fitness_events" ADD CONSTRAINT "deal_fitness_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_fitness_events" ADD CONSTRAINT "deal_fitness_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_fitness_scores" ADD CONSTRAINT "deal_fitness_scores_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_fitness_scores_deal_id_idx" ON "deal_fitness_scores" USING btree ("deal_id");