CREATE TYPE "public"."cap_size" AS ENUM('S', 'M', 'L');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."texture" AS ENUM('afro', 'kinkyYaki', 'lightYaki', 'curly');--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"kind" "media_kind" DEFAULT 'image' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"approved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"texture" texture NOT NULL,
	"description_fr" text NOT NULL,
	"description_en" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"length_inches" integer NOT NULL,
	"color" text NOT NULL,
	"cap_size" "cap_size" NOT NULL,
	"price_xaf" integer NOT NULL,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"stock_reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 2 NOT NULL,
	"preorder_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variants_price_positive" CHECK ("variants"."price_xaf" > 0),
	CONSTRAINT "variants_stock_non_negative" CHECK ("variants"."stock_on_hand" >= 0 AND "variants"."stock_reserved" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;