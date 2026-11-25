import { createPool } from './src/db/index.js';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import 'dotenv/config';

async function seed() {
  try {
    console.log("Menambahkan Superadmin ke Database PostgreSQL...");
    const newUser = await db.insert(users).values({
      uid: 'admin-001',
      username: 'admin',
      password: 'password123',
      name: 'Super Administrator',
      email: 'admin@isp.local',
      role: 'SUPERADMIN'
    }).returning();
    
    console.log("Sukses! Anda bisa login menggunakan:");
    console.log("Username: admin");
    console.log("Password: password123");
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.log("User 'admin' sudah ada di dalam database.");
    } else {
      console.error("Gagal menambahkan:", error);
    }
    process.exit(1);
  }
}
seed();
