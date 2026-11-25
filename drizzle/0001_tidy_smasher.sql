CREATE TABLE "team_materials" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"team_id" text NOT NULL,
	"team_name" text NOT NULL,
	"tech_id" text NOT NULL,
	"tech_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"status" text NOT NULL,
	"date_issued" text NOT NULL,
	"date_depleted" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_code_unique";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_invoice_number_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_uid_unique";--> statement-breakpoint
ALTER TABLE "modem_sns" DROP CONSTRAINT "modem_sns_serial_number_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "opnames" DROP CONSTRAINT "opnames_opname_number_unique";--> statement-breakpoint
ALTER TABLE "requisitions" DROP CONSTRAINT "requisitions_request_number_unique";--> statement-breakpoint
ALTER TABLE "units" DROP CONSTRAINT "units_name_unique";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "category_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "current_stock" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "current_stock" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "minimum_stock" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "minimum_stock" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "area" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "leader_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "invoice_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "item_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "processed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "uid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "modem_sns" ALTER COLUMN "serial_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "modem_sns" ALTER COLUMN "item_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "modem_sns" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "nik" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "timestamp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "action" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "details" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "batch_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "item_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cable_usages" ALTER COLUMN "item_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cable_usages" ALTER COLUMN "length_used" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cable_usages" ALTER COLUMN "technician_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cable_usages" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opnames" ALTER COLUMN "opname_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opnames" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opnames" ALTER COLUMN "performed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opnames" ALTER COLUMN "details" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "opnames" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ALTER COLUMN "request_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requisitions" ALTER COLUMN "items" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "min_stock" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "default_price" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "is_serial_tracked" boolean;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "updated_at" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "pic" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "coverage_area" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "members_count" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_number" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "item_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_type" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "team_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "tech_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "tech_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "project" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "supplier_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "serial_numbers" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "stock_before" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "stock_after" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "performed_by" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "approval_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "item_name" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "date_in" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "supplier_name" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "project_name" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "installed_date" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "optical_power" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "odp_port" text;--> statement-breakpoint
ALTER TABLE "modem_sns" ADD COLUMN "installation_photo" text;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "entity" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "item_count" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "item_name" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "supplier_name" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "date_in" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "unit_price" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "available_count" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "out_count" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "broken_count" integer;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "installed_count" integer;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "item_id" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "item_name" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "team_name" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "tech_id" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "tech_name" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "meters_used" integer;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "project" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "cable_usages" ADD COLUMN "performed_by" text;--> statement-breakpoint
ALTER TABLE "opnames" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "opnames" ADD COLUMN "items_checked_count" integer;--> statement-breakpoint
ALTER TABLE "opnames" ADD COLUMN "total_difference" integer;--> statement-breakpoint
ALTER TABLE "opnames" ADD COLUMN "items" jsonb;--> statement-breakpoint
ALTER TABLE "opnames" ADD COLUMN "completed_at" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "req_number" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "requisition_number" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "project" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "supervisor_notes" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "approval_notes" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "approved_at" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "completed_by" text;--> statement-breakpoint
ALTER TABLE "requisitions" ADD COLUMN "completed_at" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "symbol" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "contact_person" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "email" text;