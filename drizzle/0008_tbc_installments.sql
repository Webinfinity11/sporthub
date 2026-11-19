ALTER TABLE "orders" ADD COLUMN "tbc_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_detail" text DEFAULT '' NOT NULL;