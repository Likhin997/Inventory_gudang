import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/inventory_db' });
async function main() {
  await pool.query('CREATE TABLE IF NOT EXISTS "teams" ("id" text PRIMARY KEY NOT NULL, "name" text, "leader" text, "members" jsonb, "description" text, "is_active" boolean DEFAULT true, "created_at" timestamp DEFAULT now());');
  try {
    await pool.query('ALTER TABLE "technicians" ADD COLUMN "team_id" text;');
  } catch(e) {
    console.log(e.message);
  }
  console.log("DB updated");
  process.exit(0);
}
main();
