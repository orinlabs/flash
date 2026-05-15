CREATE TABLE "mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"signature" text,
	"sender_bio" text,
	"oauth_refresh_token" text,
	"oauth_access_token" text,
	"oauth_expires_at" timestamp with time zone,
	"scopes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"person_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"body_html" text,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"review_notes" text,
	"agent_rationale" text,
	"sent_at" timestamp with time zone,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"send_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_status" text DEFAULT 'dormant' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_mailbox_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_strategy" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_next_wake_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_last_worked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "outreach_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_events" ADD CONSTRAINT "outreach_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailboxes_email_lower_unique" ON "mailboxes" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "mailboxes_status_idx" ON "mailboxes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_drafts_company_idx" ON "outreach_drafts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "outreach_drafts_mailbox_idx" ON "outreach_drafts" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "outreach_drafts_status_idx" ON "outreach_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_drafts_created_idx" ON "outreach_drafts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "outreach_events_company_idx" ON "outreach_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "outreach_events_created_idx" ON "outreach_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "companies_outreach_status_idx" ON "companies" USING btree ("outreach_status");--> statement-breakpoint
CREATE INDEX "companies_outreach_wake_idx" ON "companies" USING btree ("outreach_next_wake_at");