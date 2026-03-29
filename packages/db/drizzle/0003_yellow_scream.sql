CREATE TABLE "manager_directives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"vertical" text,
	"target_role" text,
	"target_member_id" uuid,
	"directive" text NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_intelligence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vertical" text,
	"account_id" uuid,
	"insight_type" text NOT NULL,
	"title" text NOT NULL,
	"insight" text NOT NULL,
	"supporting_data" jsonb,
	"confidence" numeric(3, 2),
	"relevance_score" numeric(3, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "close_competitor" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "close_notes" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "close_improvement" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "win_turning_point" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "win_replicable" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "manager_directives" ADD CONSTRAINT "manager_directives_author_id_team_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_directives" ADD CONSTRAINT "manager_directives_target_member_id_team_members_id_fk" FOREIGN KEY ("target_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_intelligence" ADD CONSTRAINT "system_intelligence_account_id_companies_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;