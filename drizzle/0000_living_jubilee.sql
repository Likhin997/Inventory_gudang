-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category_type" text NOT NULL,
	"category_id" text NOT NULL,
	"brand" text,
	"unit" text NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"location" text,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"leader_name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text NOT NULL,
	"item_code" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"date" text NOT NULL,
	"reference_id" text,
	"notes" text,
	"processed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"avatar" text,
	"created_at" timestamp DEFAULT now(),
	"password" text NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "modem_sns" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"mac_address" text,
	"item_code" text NOT NULL,
	"status" text NOT NULL,
	"location" text,
	"customer_name" text,
	"customer_address" text,
	"history" jsonb,
	"created_at" timestamp DEFAULT now(),
	"assigned_tech_id" text,
	"assigned_tech_name" text,
	"assigned_team_id" text,
	"assigned_team_name" text,
	CONSTRAINT "modem_sns_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nik" text NOT NULL,
	"team_id" text NOT NULL,
	"team_name" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" text NOT NULL,
	"performed_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_number" text NOT NULL,
	"item_code" text NOT NULL,
	"quantity" integer NOT NULL,
	"supplier_id" text,
	"expiration_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cable_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"item_code" text NOT NULL,
	"length_used" integer NOT NULL,
	"technician_id" text NOT NULL,
	"technician_name" text,
	"project_name" text,
	"notes" text,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opnames" (
	"id" text PRIMARY KEY NOT NULL,
	"opname_number" text NOT NULL,
	"date" text NOT NULL,
	"performed_by" text NOT NULL,
	"notes" text,
	"category_filter" text,
	"details" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "opnames_opname_number_unique" UNIQUE("opname_number")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "requisitions" (
	"id" text PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"date" text NOT NULL,
	"team_id" text NOT NULL,
	"team_name" text,
	"tech_id" text,
	"tech_name" text,
	"project_name" text,
	"status" text NOT NULL,
	"notes" text,
	"items" jsonb NOT NULL,
	"approved_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "requisitions_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"address" text,
	"created_at" timestamp DEFAULT now()
);

*/