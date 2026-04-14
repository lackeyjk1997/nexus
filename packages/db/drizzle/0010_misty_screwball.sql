CREATE TABLE "coordinator_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_id" text NOT NULL,
	"signal_type" text NOT NULL,
	"vertical" text,
	"competitor" text,
	"deal_ids" text[],
	"deal_names" text[],
	"synthesis" text,
	"recommendations" jsonb,
	"arr_impact" integer DEFAULT 0,
	"deal_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active',
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"synthesized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coordinator_patterns_pattern_id_unique" UNIQUE("pattern_id")
);
--> statement-breakpoint
CREATE TABLE "deal_agent_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_interaction_date" timestamp,
	"last_interaction_summary" text,
	"learnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competitive_context" jsonb,
	"coordinated_intel" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brief_ready" jsonb,
	"brief_pending" boolean DEFAULT false NOT NULL,
	"pipeline_status" text DEFAULT 'idle' NOT NULL,
	"pipeline_step" text,
	"pipeline_details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_transcripts" ADD COLUMN "pipeline_processed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "deal_agent_states" ADD CONSTRAINT "deal_agent_states_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_agent_states_deal_id_idx" ON "deal_agent_states" USING btree ("deal_id");