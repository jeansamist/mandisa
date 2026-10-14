CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"data" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"visitor_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"landing_path" text,
	"referrer" text,
	"utm" jsonb,
	"locale" text,
	"device" text,
	"user_agent" text,
	"page_views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "visitor_id" uuid;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_analytics_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_session_idx" ON "analytics_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("type","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_sessions_visitor_idx" ON "analytics_sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "analytics_sessions_started_idx" ON "analytics_sessions" USING btree ("started_at");