ALTER TABLE "deals" ADD COLUMN "close_ai_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "close_factors" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "win_factors" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "close_ai_ran_at_timestamp" timestamp;