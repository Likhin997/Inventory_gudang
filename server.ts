import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import apiRouter from "./src/routes/api.js";
import syncRouter from "./src/routes/sync.js";
import resetRouter from "./src/routes/reset.js";

function getLogTime(): string {
  const d = new Date();
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false }) + " WIB";
}

export async function runSelfHealMigrations() {
  try {
    const { createPool } = await import("./src/db/index.js");
    const pool = createPool();
    await pool.query(`
      -- Ensure team_materials table exists
      CREATE TABLE IF NOT EXISTS team_materials (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        team_id TEXT NOT NULL DEFAULT 'unknown-team',
        team_name TEXT NOT NULL DEFAULT 'Unknown Team',
        tech_id TEXT NOT NULL,
        tech_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        date_issued TEXT NOT NULL,
        date_depleted TEXT,
        notes TEXT
      );

      -- Ensure modem_sns columns exist
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_team_id TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_team_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS team_id TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS team_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_tech_id TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS assigned_tech_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS customer_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS customer_address TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS installed_date TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS optical_power TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS odp_port TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS installation_photo TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS installation_type TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS keterangan TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS project_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS purpose TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS batch_id TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS batch_number TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS brand TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS model TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS date_in TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS supplier_name TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS price INTEGER;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS item_code TEXT;
      ALTER TABLE modem_sns ADD COLUMN IF NOT EXISTS history JSONB;

      -- Ensure transactions columns exist
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_id TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_name TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tech_id TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tech_name TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS project TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS purpose TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_number TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS batch_number TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_name TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS serial_numbers JSONB;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stock_before INTEGER;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stock_after INTEGER;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS performed_by TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approval_id TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS item_code TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed_by TEXT;

      -- Ensure technicians columns exist
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS nik TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS team_id TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS team_name TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE technicians ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

      -- Ensure teams columns exist
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS code TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_name TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS pic TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS area TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS coverage_area TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS members_count INTEGER;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS members JSONB;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

      -- Ensure users columns exist
      ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

      -- Ensure cable_usages columns exist
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS customer_name TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS item_code TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS length_used INTEGER;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS meters_used INTEGER;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS tech_id TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS tech_name TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS team_id TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS team_name TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS technician_id TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS technician_name TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS project TEXT;
      ALTER TABLE cable_usages ADD COLUMN IF NOT EXISTS project_name TEXT;

      -- Ensure items columns exist
      ALTER TABLE items ADD COLUMN IF NOT EXISTS category_type TEXT;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS model TEXT;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock INTEGER;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS minimum_stock INTEGER;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS default_price INTEGER;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS is_serial_tracked BOOLEAN;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TEXT;
      ALTER TABLE items ADD COLUMN IF NOT EXISTS image TEXT;
    `);
    console.log(`[${getLogTime()}] [DB:MIGRATE] ✅ Database schema auto-migration succeeded.`);
  } catch (err: any) {
    console.warn(`[${getLogTime()}] [DB:MIGRATE] ⚠️ Auto-migration note:`, err.message);
  }
}

async function startServer() {
  await runSelfHealMigrations();
  const app = express();
  const portArgIndex = process.argv.indexOf("--port");
  const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
  const isProd = process.env.NODE_ENV === "production";
  const PORT = cliPort || (isProd && process.env.PORT ? Number(process.env.PORT) : 3000);

  app.use(express.json({ limit: "50mb" }));

  // HTTP Request Logger for Docker logs
  app.use((req, res, next) => {
    // Only log API routes and HTML entries, exclude static bundles/icons
    const isApi = req.path.startsWith('/api');
    const isMain = req.path === '/' || req.path === '/index.html';
    if (isApi || isMain || req.method !== 'GET') {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const icon = status >= 500 ? '🚨' : status >= 400 ? '⚠️' : '✅';
        console.log(`[${getLogTime()}] [HTTP] ${icon} ${req.method} ${req.originalUrl || req.path} ${status} (${duration}ms)`);
      });
    }
    next();
  });

  // API routes
  app.use("/api/sync", syncRouter);
  app.use("/api/reset", resetRouter);
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[${getLogTime()}] [SERVER:ERROR] ❌ Uncaught error on ${req.method} ${req.path}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  });

  app.listen(PORT, "0.0.0.0", async () => {
    try {
      const { createPool } = await import("./src/db/index.js");
      const pool = createPool();
      const itemsRes = await pool.query("SELECT COUNT(*) FROM items");
      const modemsRes = await pool.query("SELECT status, COUNT(*) FROM modem_sns GROUP BY status");
      const totalItems = itemsRes.rows[0]?.count || 0;
      const statusCounts = modemsRes.rows.map((r: any) => `${r.count} ${r.status}`).join(', ') || '0 SN';

      console.log("================================================================================");
      console.log(`🚀 [DOCKER APP] GUDANG JETCYBER APP AKTIF & BERJALAN`);
      console.log(`📅 Waktu Server  : ${getLogTime()}`);
      console.log(`🌐 Alamat Server : http://0.0.0.0:${PORT} (Node.js ${process.version})`);
      console.log(`📦 Status Data   : ${totalItems} Master Barang | Modem SN: [${statusCounts}]`);
      console.log(`📋 Docker Log    : docker logs -f gudang_jetcyber_app`);
      console.log("================================================================================");
    } catch (e: any) {
      console.log(`[${getLogTime()}] 🚀 Server running on http://0.0.0.0:${PORT}`);
    }
  });
}

startServer();
