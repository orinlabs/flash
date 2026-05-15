CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"units" integer,
	"cost_usd" numeric(14, 6),
	"estimated" boolean DEFAULT false NOT NULL,
	"campaign_id" uuid,
	"campaign_run_id" uuid,
	"company_id" uuid,
	"person_id" uuid,
	"slot_index" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_campaign_run_id_campaign_runs_id_fk" FOREIGN KEY ("campaign_run_id") REFERENCES "public"."campaign_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_events_campaign_idx" ON "usage_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "usage_events_run_idx" ON "usage_events" USING btree ("campaign_run_id");--> statement-breakpoint
CREATE INDEX "usage_events_company_idx" ON "usage_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "usage_events_person_idx" ON "usage_events" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "usage_events_provider_idx" ON "usage_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "usage_events_created_idx" ON "usage_events" USING btree ("created_at");