ALTER TABLE "outreach_drafts" ADD COLUMN "channel" text NOT NULL DEFAULT 'email';
--> statement-breakpoint
ALTER TABLE "outreach_drafts" ALTER COLUMN "company_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "outreach_drafts" ALTER COLUMN "mailbox_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "outreach_drafts" ALTER COLUMN "to_email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "outreach_drafts" ALTER COLUMN "subject" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_email_required" CHECK (
  channel <> 'email' OR (
    mailbox_id IS NOT NULL
    AND to_email IS NOT NULL
    AND subject IS NOT NULL
    AND company_id IS NOT NULL
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_drafts_channel_idx" ON "outreach_drafts" ("channel");
