import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function drop() {
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`);
  console.log('Schema dropped');
  process.exit(0);
}
drop();
