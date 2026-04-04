ALTER TABLE "account_health" ADD COLUMN "contracted_use_cases" jsonb;--> statement-breakpoint
ALTER TABLE "account_health" ADD COLUMN "expansion_map" jsonb;--> statement-breakpoint
ALTER TABLE "account_health" ADD COLUMN "proactive_signals" jsonb;