CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"hours" text DEFAULT '' NOT NULL,
	"facebook" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"tiktok" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
