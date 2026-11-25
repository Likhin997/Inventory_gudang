import pg from 'pg';
const { Pool } = pg;

const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL
} : {
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_USER || 'admin',
  password: process.env.SQL_PASSWORD || '11013009',
  database: process.env.SQL_DB_NAME || 'inventory_JCN',
});

async function main() {
  console.log("[DB_MIGRATE] Memeriksa & membuat semua tabel database yang dibutuhkan...");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "uid" text,
        "username" text,
        "password" text,
        "email" text,
        "name" text,
        "role" text,
        "avatar" text,
        "phone" text,
        "active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text,
        "leader" text,
        "members" jsonb,
        "description" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "technicians" (
        "id" text PRIMARY KEY NOT NULL,
        "nik" text,
        "name" text,
        "phone" text,
        "team_id" text,
        "team_name" text,
        "status" text,
        "email" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "categories" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text,
        "name" text,
        "type" text,
        "description" text,
        "item_count" integer,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "units" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text,
        "name" text,
        "symbol" text,
        "description" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text,
        "name" text,
        "contact_person" text,
        "phone" text,
        "email" text,
        "address" text,
        "contact" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "projects" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text,
        "name" text,
        "client" text,
        "location" text,
        "status" text,
        "start_date" text,
        "description" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "items" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text,
        "name" text,
        "category_id" text,
        "category_type" text,
        "brand" text,
        "model" text,
        "unit" text,
        "current_stock" integer,
        "min_stock" integer,
        "minimum_stock" integer,
        "location" text,
        "default_price" integer,
        "description" text,
        "is_serial_tracked" boolean,
        "created_at" timestamp DEFAULT now(),
        "updated_at" text,
        "image" text
      );

      CREATE TABLE IF NOT EXISTS "batches" (
        "id" text PRIMARY KEY NOT NULL,
        "batch_number" text,
        "item_id" text,
        "item_name" text,
        "supplier_id" text,
        "supplier_name" text,
        "date_in" text,
        "invoice_number" text,
        "quantity" integer,
        "unit_price" integer,
        "notes" text,
        "available_count" integer,
        "out_count" integer,
        "broken_count" integer,
        "installed_count" integer,
        "item_code" text,
        "expiration_date" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "modem_sns" (
        "id" text PRIMARY KEY NOT NULL,
        "item_id" text,
        "item_name" text,
        "brand" text,
        "model" text,
        "batch_id" text,
        "batch_number" text,
        "serial_number" text,
        "mac_address" text,
        "status" text,
        "location" text,
        "date_in" text,
        "supplier_name" text,
        "price" integer,
        "notes" text,
        "assigned_tech_id" text,
        "assigned_tech_name" text,
        "team_id" text,
        "team_name" text,
        "assigned_team_id" text,
        "assigned_team_name" text,
        "project_name" text,
        "purpose" text,
        "customer_name" text,
        "customer_address" text,
        "installed_date" text,
        "optical_power" text,
        "odp_port" text,
        "installation_photo" text,
        "history" jsonb,
        "item_code" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "cable_usages" (
        "id" text PRIMARY KEY NOT NULL,
        "item_id" text,
        "item_name" text,
        "tech_id" text,
        "tech_name" text,
        "meters_used" integer,
        "date" text,
        "project" text,
        "purpose" text,
        "notes" text,
        "performed_by" text,
        "item_code" text,
        "length_used" integer,
        "technician_id" text,
        "technician_name" text,
        "project_name" text,
        "is_finished" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" text PRIMARY KEY NOT NULL,
        "transaction_number" text,
        "type" text,
        "date" text,
        "item_id" text,
        "item_name" text,
        "category_type" text,
        "quantity" integer,
        "unit" text,
        "tech_id" text,
        "tech_name" text,
        "team_id" text,
        "team_name" text,
        "customer_name" text,
        "project" text,
        "purpose" text,
        "invoice_number" text,
        "batch_number" text,
        "supplier_name" text,
        "serial_numbers" jsonb,
        "notes" text,
        "stock_before" integer,
        "stock_after" integer,
        "performed_by" text,
        "status" text,
        "approval_id" text,
        "item_code" text,
        "reference_id" text,
        "processed_by" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "opnames" (
        "id" text PRIMARY KEY NOT NULL,
        "opname_number" text,
        "date" text,
        "status" text,
        "category_filter" text,
        "performed_by" text,
        "verified_by" text,
        "notes" text,
        "items_checked_count" integer,
        "total_difference" integer,
        "details" jsonb,
        "items" jsonb,
        "created_at" timestamp DEFAULT now(),
        "completed_at" text
      );

      CREATE TABLE IF NOT EXISTS "requisitions" (
        "id" text PRIMARY KEY NOT NULL,
        "req_number" text,
        "requisition_number" text,
        "date" text,
        "tech_id" text,
        "tech_name" text,
        "project" text,
        "purpose" text,
        "notes" text,
        "items" jsonb,
        "status" text,
        "supervisor_notes" text,
        "approval_notes" text,
        "approved_by" text,
        "approved_at" text,
        "completed_by" text,
        "completed_at" text,
        "request_number" text,
        "project_name" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "timestamp" text,
        "user_id" text,
        "user_name" text,
        "role" text,
        "action" text,
        "entity" text,
        "entity_id" text,
        "details" text,
        "ip_address" text,
        "entity_type" text,
        "performed_by" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "team_materials" (
        "id" text PRIMARY KEY NOT NULL,
        "item_id" text NOT NULL,
        "item_name" text NOT NULL,
        "team_id" text NOT NULL DEFAULT 'unknown-team',
        "team_name" text NOT NULL DEFAULT 'Unknown Team',
        "tech_id" text NOT NULL,
        "tech_name" text NOT NULL,
        "quantity" integer NOT NULL,
        "unit" text NOT NULL,
        "status" text NOT NULL,
        "date_issued" text NOT NULL,
        "date_depleted" text,
        "notes" text
      );
    `);
    
    // Safety column patches for existing tables
    try {
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS team_name text;');
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS nik text;');
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone text;');
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS status text;');
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS email text;');
      await pool.query('ALTER TABLE technicians ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;');
    } catch (e) { /* ignore */ }

    try {
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS code text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_name text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS pic text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS phone text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS status text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS area text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS coverage_area text;');
      await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS members_count integer;');
    } catch (e) { /* ignore */ }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id text;');
    } catch (e) { /* ignore */ }

    try {
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false;');
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS customer_name text;');
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS team_id text;');
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS team_name text;');
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS tech_id text;');
      await pool.query('ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS tech_name text;');
    } catch (e) { /* ignore */ }

    try {
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS item_code text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS installation_type text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS keterangan text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS team_id text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS team_name text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_team_id text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_team_name text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_tech_id text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_tech_name text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS optical_power text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS odp_port text;');
      await pool.query('ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS installation_photo text;');
    } catch (e) { /* ignore */ }

    try {
      await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_id text;');
      await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_name text;');
      await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name text;');
    } catch (e) { /* ignore */ }

    console.log("[DB_MIGRATE] ✅ Semua tabel database siap dan terverifikasi!");
  } catch (err) {
    console.error("[DB_MIGRATE] ❌ Gagal melakukan migrasi tabel:", err);
  } finally {
    process.exit(0);
  }
}
main();
