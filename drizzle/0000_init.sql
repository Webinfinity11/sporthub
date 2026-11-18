CREATE TYPE "public"."order_status" AS ENUM('new', 'confirmed', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" serial PRIMARY KEY NOT NULL,
	"image" text NOT NULL,
	"align" text DEFAULT 'right' NOT NULL,
	"position" text DEFAULT 'center center' NOT NULL,
	"shade" text DEFAULT 'none' NOT NULL,
	"title_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"subtitle_highlight" text DEFAULT '' NOT NULL,
	"large" text DEFAULT '' NOT NULL,
	"primary_label" text DEFAULT '' NOT NULL,
	"primary_href" text DEFAULT '/catalog' NOT NULL,
	"secondary_label" text DEFAULT '' NOT NULL,
	"secondary_href" text DEFAULT '/catalog' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"name" text NOT NULL,
	"image" text,
	"price" numeric(10, 2) NOT NULL,
	"qty" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"payment" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"delivery" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"old_price" numeric(10, 2),
	"category_id" integer,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;