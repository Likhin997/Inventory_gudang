import { Router } from "express";
import { db } from "../db/index.js";

import { eq, sql } from 'drizzle-orm';
import { runSelfHealMigrations } from "../../server.js";

import { 
  users, items, technicians, teams, modemSns, transactions, 
  categories, units, suppliers, projects, batches, 
  cableUsages, requisitions, opnames, auditLogs, teamMaterials } from "../db/schema.js";

const router = Router();

function getTimestampWIB(): string {
  const now = new Date();
  return now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false }) + " WIB";
}

// Client logs ingestion endpoint for Docker logs visibility
router.post("/logs", (req, res) => {
  try {
    const { level = 'info', source = 'Client', message = '', details = null, stack = null } = req.body || {};
    const combined = `${message || ''} ${typeof details === 'object' ? JSON.stringify(details) : (details || '')} ${stack || ''}`.toLowerCase();
    if (
      combined.includes('websocket') ||
      combined.includes('[vite]') ||
      combined.includes('vite:ws') ||
      combined.includes('chrome-extension://') ||
      combined.includes('moz-extension://') ||
      combined.includes('safari-extension://') ||
      combined.includes('cannot set property fetch of #<window>')
    ) {
      return res.json({ received: true });
    }
    const icon = level === 'error' ? '❌ [CLIENT:ERROR]' : level === 'warn' ? '⚠️ [CLIENT:WARN]' : 'ℹ️ [CLIENT:INFO]';
    const detailStr = details ? ` | details: ${typeof details === 'object' ? JSON.stringify(details) : details}` : '';
    console.log(`[${getTimestampWIB()}] ${icon} [${source}] ${message}${detailStr}`);
    if (stack && level === 'error') {
      console.error(`[${getTimestampWIB()}] [CLIENT:STACK]`, stack);
    }
  } catch (e) {
    // Ignore logging serialization errors
  }
  res.json({ received: true });
});

// Generic helper for basic CRUD
const createCrudRouter = (table: any, name: string) => {
  const r = Router();
  
  r.get("/", async (req, res) => {
    try {
      const data = await db.select().from(table);
      if (name === 'modemSns' || name === 'transactions') {
        console.log(`[${getTimestampWIB()}] [${name.toUpperCase()}:GET] Memuat ${data.length} records`);
      }
      res.json(data);
    } catch (err: any) {
      if (err?.code === '42703' || err?.code === '42P01') {
        try {
          await runSelfHealMigrations();
          const retryData = await db.select().from(table);
          return res.json(retryData);
        } catch (retryErr) {
          console.warn(`Retry get ${name} failed:`, retryErr);
        }
      }
      console.error(`[${getTimestampWIB()}] [${name.toUpperCase()}:ERROR] Fetch error:`, err?.message || err);
      res.status(500).json({ error: err.message });
    }
  });

  r.post("/", async (req, res) => {
    try {
      const payload = { ...req.body };
      if (!payload.id) {
        payload.id = crypto.randomUUID();
      }
      const result = await db.insert(table).values(payload).returning();
      console.log(`[${getTimestampWIB()}] [${name.toUpperCase()}:POST] Tambah data: id=${payload.id}, info=${payload.name || payload.serialNumber || payload.transactionNumber || ''}`);
      res.status(201).json(result[0]);
    } catch (err: any) {
      console.error(`[${getTimestampWIB()}] [${name.toUpperCase()}:POST_ERROR] Error creating:`, err?.message || err);
      res.status(500).json({ error: err.message });
    }
  });

  r.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.update(table).set(req.body).where(eq(table.id, id)).returning();
      if ((result as any[]).length === 0) return res.status(404).json({ error: "Not found" });
      console.log(`[${getTimestampWIB()}] [${name.toUpperCase()}:PUT] Update data: id=${id}, status=${req.body?.status || 'updated'}`);
      res.json(result[0]);
    } catch (err: any) {
      console.error(`[${getTimestampWIB()}] [${name.toUpperCase()}:PUT_ERROR] Error updating ${name}:`, err?.message || err);
      res.status(500).json({ error: err.message });
    }
  });

  r.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.delete(table).where(eq(table.id, id)).returning();
      if ((result as any[]).length === 0) return res.status(404).json({ error: "Not found" });
      console.log(`[${getTimestampWIB()}] [${name.toUpperCase()}:DELETE] Hapus data: id=${id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[${getTimestampWIB()}] [${name.toUpperCase()}:DELETE_ERROR] Error deleting ${name}:`, err?.message || err);
      res.status(500).json({ error: err.message });
    }
  });

  return r;
};

// DEDICATED USERS ROUTER
const usersRouter = Router();

// GET /api/users
usersRouter.get("/", async (req, res) => {
  try {
    const data = await db.select().from(users);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Add User)
usersRouter.post("/", async (req, res) => {
  try {
    const { username, password, name, email, role, phone, avatar, teamId, active } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername) {
      return res.status(400).json({ error: "Username wajib diisi." });
    }
    if (!cleanPassword) {
      return res.status(400).json({ error: "Password wajib diisi." });
    }

    // Check if username already exists (case-insensitive)
    const existing = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` });
    }

    const newUser = {
      id: req.body.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: cleanUsername,
      password: cleanPassword,
      name: (name || cleanUsername).trim(),
      email: (email || '').trim(),
      role: role || 'GUDANG',
      phone: (phone || '').trim() || null,
      avatar: avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=100`,
      teamId: teamId || null,
      active: active !== undefined ? Boolean(active) : true,
      createdAt: new Date().toISOString()
    };

    const result = await db.insert(users).values(newUser).returning();
    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id (Update User)
usersRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingList = await db.select().from(users).where(eq(users.id, id));
    if (existingList.length === 0) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }
    const current = existingList[0];

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = (req.body.name || '').trim();
    if (req.body.email !== undefined) updates.email = (req.body.email || '').trim();
    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.phone !== undefined) updates.phone = (req.body.phone || '').trim() || null;
    if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    if (req.body.teamId !== undefined) updates.teamId = req.body.teamId || null;

    // Check username update
    if (req.body.username) {
      const cleanUsername = req.body.username.trim().toLowerCase();
      if (cleanUsername !== current.username?.toLowerCase()) {
        const dup = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${cleanUsername}) AND ${users.id} != ${id}`);
        if (dup.length > 0) {
          return res.status(400).json({ error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` });
        }
      }
      updates.username = cleanUsername;
    }

    // CRITICAL: Only overwrite password if user actually typed a non-empty password!
    if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim() !== '') {
      updates.password = req.body.password.trim();
    }

    const updated = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    res.json(updated[0]);
  } catch (err: any) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
usersRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingList = await db.select().from(users).where(eq(users.id, id));
    if (existingList.length > 0) {
      if (existingList[0].username === 'admin' || existingList[0].id === 'usr-1') {
        return res.status(400).json({ error: "Akun Super Admin utama tidak boleh dihapus demi keamanan sistem." });
      }
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: err.message });
  }
});

router.use("/users", usersRouter);
router.use("/teams", createCrudRouter(teams, "teams"));
router.use("/items", createCrudRouter(items, "items"));
router.use("/technicians", createCrudRouter(technicians, "technicians"));
router.use("/modems", createCrudRouter(modemSns, "modemSns"));
router.use("/transactions", createCrudRouter(transactions, "transactions"));
router.use("/categories", createCrudRouter(categories, "categories"));
router.use("/units", createCrudRouter(units, "units"));
router.use("/suppliers", createCrudRouter(suppliers, "suppliers"));
router.use("/projects", createCrudRouter(projects, "projects"));
router.use("/batches", createCrudRouter(batches, "batches"));
router.use("/cable-usages", createCrudRouter(cableUsages, "cableUsages"));
router.use("/requisitions", createCrudRouter(requisitions, "requisitions"));
router.use("/opnames", createCrudRouter(opnames, "opnames"));
router.use("/audit-logs", createCrudRouter(auditLogs, "auditLogs"));
router.use("/team-materials", createCrudRouter(teamMaterials, "teamMaterials"));

// POST /api/login with case-insensitive username and trimmed whitespace check
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }
    
    // Case-insensitive query
    const usersList = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${cleanUsername})`);
    if (usersList.length === 0) {
      console.warn(`[${getTimestampWIB()}] [AUTH:WARN] ❌ Login gagal: username "${cleanUsername}" tidak ditemukan`);
      return res.status(401).json({ error: "Username atau password salah." });
    }
    
    const user = usersList[0];
    const storedPassword = (user.password || '').trim();
    
    if (storedPassword !== cleanPassword) {
      console.warn(`[${getTimestampWIB()}] [AUTH:WARN] ❌ Login gagal: password salah untuk user "${cleanUsername}"`);
      return res.status(401).json({ error: "Username atau password salah." });
    }
    
    if (!user.active) {
      console.warn(`[${getTimestampWIB()}] [AUTH:WARN] ⚠️ Login ditolak: user "${cleanUsername}" non-aktif`);
      return res.status(403).json({ error: "Akun Anda dinonaktifkan. Hubungi Super Admin." });
    }
    
    console.log(`[${getTimestampWIB()}] [AUTH:LOGIN] ✅ User "${cleanUsername}" (${user.role}) berhasil masuk`);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err: any) {
    console.error(`[${getTimestampWIB()}] [AUTH:ERROR] Login error:`, err?.message || err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

