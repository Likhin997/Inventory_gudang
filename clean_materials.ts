import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/db/schema.js';

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool(dbUrl ? {
  connectionString: dbUrl,
} : {
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
const db = drizzle(pool, { schema });

async function run() {
  console.log("Menghapus semua data teamMaterials dari database...");
  await db.delete(schema.teamMaterials);
  console.log("✅ Berhasil dihapus dari database!");
  process.exit(0);
}
run().catch(console.error);
