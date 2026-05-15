CREATE TABLE "campaign_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"qualified_count" integer DEFAULT 0 NOT NULL,
	"checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icp_document" text NOT NULL,
	"target_count" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"industry" text,
	"employee_range" text,
	"hq_location" text,
	"enrichment_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"person_id" uuid,
	"source_type" text NOT NULL,
	"source_query" text,
	"source_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"full_name" text,
	"name_normalized" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"twitter_url" text,
	"title" text,
	"seniority" text,
	"department" text,
	"notes" text,
	"context" text,
	"icp_keywords" jsonb,
	"enrichment_last_attempt_at" timestamp with time zone,
	"enrichment_sources" jsonb,
	"lifecycle_status" text DEFAULT 'new' NOT NULL,
	"first_seen_campaign_id" uuid,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_runs" ADD CONSTRAINT "campaign_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_events" ADD CONSTRAINT "discovery_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_events" ADD CONSTRAINT "discovery_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_first_seen_campaign_id_campaigns_id_fk" FOREIGN KEY ("first_seen_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_runs_campaign_idx" ON "campaign_runs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_runs_status_idx" ON "campaign_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_domain_lower_unique" ON "companies" USING btree (lower(trim("domain"))) WHERE "companies"."domain" is not null;--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "discovery_events_campaign_idx" ON "discovery_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "discovery_events_person_idx" ON "discovery_events" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_email_lower_unique" ON "people" USING btree (lower(trim("email"))) WHERE "people"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "people_linkedin_url_unique" ON "people" USING btree ("linkedin_url") WHERE "people"."linkedin_url" is not null;--> statement-breakpoint
CREATE INDEX "people_company_idx" ON "people" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "people_lifecycle_idx" ON "people" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "people_first_campaign_idx" ON "people" USING btree ("first_seen_campaign_id");