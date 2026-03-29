CREATE TABLE "cross_agent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_member_id" uuid NOT NULL,
	"target_member_id" uuid NOT NULL,
	"content" text NOT NULL,
	"deal_id" uuid,
	"account_id" uuid,
	"vertical" "vertical",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cross_agent_feedback" ADD CONSTRAINT "cross_agent_feedback_source_member_id_team_members_id_fk" FOREIGN KEY ("source_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_agent_feedback" ADD CONSTRAINT "cross_agent_feedback_target_member_id_team_members_id_fk" FOREIGN KEY ("target_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_agent_feedback" ADD CONSTRAINT "cross_agent_feedback_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_agent_feedback" ADD CONSTRAINT "cross_agent_feedback_account_id_companies_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;