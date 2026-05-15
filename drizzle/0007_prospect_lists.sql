CREATE TABLE "prospect_lists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "prospect_list_people" (
  "list_id" uuid NOT NULL,
  "person_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "prospect_list_companies" (
  "list_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "prospect_list_people"
  ADD CONSTRAINT "prospect_list_people_list_id_prospect_lists_id_fk"
  FOREIGN KEY ("list_id") REFERENCES "public"."prospect_lists"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "prospect_list_people"
  ADD CONSTRAINT "prospect_list_people_person_id_people_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "public"."people"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "prospect_list_companies"
  ADD CONSTRAINT "prospect_list_companies_list_id_prospect_lists_id_fk"
  FOREIGN KEY ("list_id") REFERENCES "public"."prospect_lists"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "prospect_list_companies"
  ADD CONSTRAINT "prospect_list_companies_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "prospect_lists_type_idx" ON "prospect_lists" USING btree ("type");
CREATE INDEX "prospect_lists_created_idx" ON "prospect_lists" USING btree ("created_at");
CREATE UNIQUE INDEX "prospect_list_people_unique" ON "prospect_list_people" USING btree ("list_id","person_id");
CREATE INDEX "prospect_list_people_list_idx" ON "prospect_list_people" USING btree ("list_id");
CREATE INDEX "prospect_list_people_person_idx" ON "prospect_list_people" USING btree ("person_id");
CREATE UNIQUE INDEX "prospect_list_companies_unique" ON "prospect_list_companies" USING btree ("list_id","company_id");
CREATE INDEX "prospect_list_companies_list_idx" ON "prospect_list_companies" USING btree ("list_id");
CREATE INDEX "prospect_list_companies_company_idx" ON "prospect_list_companies" USING btree ("company_id");
