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
  console.log("[DB_SEED] Memeriksa akun Super Admin...");
  try {
    const res = await pool.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
    if (res.rows.length === 0) {
        const crypto = await import('crypto');
        const id = crypto.randomUUID();
        await pool.query(`
          INSERT INTO users (id, uid, username, password, email, name, role, active)
          VALUES ($1, 'admin-001', 'admin', 'password123', 'admin@isp.local', 'Super Administrator', 'SUPERADMIN', true)
        `, [id]);
        console.log("[DB_SEED] ✅ Akun Super Admin baru saja dibuat (username: admin)!");
    } else {
        console.log("[DB_SEED] ✅ Akun Super Admin sudah ada dan siap digunakan.");
    }
  } catch (err) {
    console.error("[DB_SEED] ❌ Gagal menambahkan admin:", err);
  } finally {
    process.exit(0);
  }
}
main();
