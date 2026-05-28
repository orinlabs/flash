ALTER TABLE "mailboxes" ADD COLUMN "last_scanned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "mailboxes" ADD COLUMN "last_scan_gmail_history_id" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_email_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "mailbox_id" uuid NOT NULL,
  "gmail_message_id" text NOT NULL,
  "gmail_thread_id" text,
  "from_email" text,
  "to_email" text,
  "subject" text,
  "body_preview" text,
  "sent_at" timestamp with time zone,
  "classification" text NOT NULL,
  "confidence" numeric,
  "rationale" text,
  "status" text NOT NULL DEFAULT 'pending',
  "imported_draft_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "external_email_candidates_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "external_email_candidates_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "external_email_candidates_imported_draft_id_fk" FOREIGN KEY ("imported_draft_id") REFERENCES "public"."outreach_drafts"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_email_candidates_gmail_message_unique" ON "external_email_candidates" ("organization_id", "gmail_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_email_candidates_org_idx" ON "external_email_candidates" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_email_candidates_status_idx" ON "external_email_candidates" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_email_candidates_mailbox_idx" ON "external_email_candidates" ("mailbox_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_email_candidates_sent_idx" ON "external_email_candidates" ("sent_at");
