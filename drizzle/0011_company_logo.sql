ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo_url" text;

UPDATE "companies"
SET "logo_url" = 'https://www.google.com/s2/favicons?domain=' || lower(trim("domain")) || '&sz=64'
WHERE "domain" IS NOT NULL
  AND trim("domain") <> ''
  AND "logo_url" IS NULL;
