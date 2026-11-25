import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { inArray } from "drizzle-orm";
import { runSelfHealMigrations } from "../../server.js";

const router = Router();

function getTimestampWIB(): string {
  const now = new Date();
  return now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false }) + " WIB";
}

async function queryTableSafe<T>(queryFn: () => Promise<T>, fallback: T, tableName?: string): Promise<T> {
  try {
    return await queryFn();
  } catch (err: any) {
    // If column missing (PostgreSQL error 42703) or table missing (42P01), attempt self-heal migration
    if (err?.code === '42703' || err?.code === '42P01') {
      try {
        await runSelfHealMigrations();
        return await queryFn();
      } catch (retryErr: any) {
        console.warn(`Auto-heal retry failed for table ${tableName}:`, retryErr?.message || retryErr);
      }
    }

    // Resilience fallback: If Drizzle query failed due to a missing column not yet migrated in database,
    // query all existing columns with raw SELECT * so the user gets all their data without breaking
    if (tableName) {
      try {
        const { createPool } = await import("../db/index.js");
        const pool = createPool();
        const res = await pool.query(`SELECT * FROM "${tableName}"`);
        if (res && res.rows) {
          const rows = res.rows.map((row: any) => {
            const mapped: any = { ...row };
            for (const key of Object.keys(row)) {
              if (key.includes('_')) {
                const camelKey = key.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
                if (mapped[camelKey] === undefined) {
                  mapped[camelKey] = row[key];
                }
              }
            }
            return mapped;
          });
          return rows as unknown as T;
        }
      } catch (rawErr: any) {
        console.warn(`Raw fallback for table ${tableName} failed:`, rawErr?.message || rawErr);
      }
    }

    console.error(`Query table ${tableName || 'unknown'} error:`, err?.message || err);
    return fallback;
  }
}

router.get("/", async (req, res) => {
  const reqStart = Date.now();
  try {
    const data = {
      users: await queryTableSafe(() => db.select().from(schema.users), [], "users"),
      teams: await queryTableSafe(() => db.select().from(schema.teams), [], "teams"),
      technicians: await queryTableSafe(() => db.select().from(schema.technicians), [], "technicians"),
      items: await queryTableSafe(() => db.select().from(schema.items), [], "items"),
      modemSns: await queryTableSafe(() => db.select().from(schema.modemSns), [], "modem_sns"),
      transactions: await queryTableSafe(() => db.select().from(schema.transactions), [], "transactions"),
      categories: await queryTableSafe(() => db.select().from(schema.categories), [], "categories"),
      units: await queryTableSafe(() => db.select().from(schema.units), [], "units"),
      suppliers: await queryTableSafe(() => db.select().from(schema.suppliers), [], "suppliers"),
      projects: await queryTableSafe(() => db.select().from(schema.projects), [], "projects"),
      batches: await queryTableSafe(() => db.select().from(schema.batches), [], "batches"),
      cableUsages: await queryTableSafe(() => db.select().from(schema.cableUsages), [], "cable_usages"),
      requisitions: await queryTableSafe(() => db.select().from(schema.requisitions), [], "requisitions"),
      opnames: await queryTableSafe(() => db.select().from(schema.opnames), [], "opnames"),
      auditLogs: await queryTableSafe(() => db.select().from(schema.auditLogs), [], "audit_logs"),
      teamMaterials: await queryTableSafe(() => db.select().from(schema.teamMaterials), [], "team_materials"),
    };

    const modemsAvail = (data.modemSns || []).filter((s: any) => s.status === 'AVAILABLE').length;
    const modemsDipinjam = (data.modemSns || []).filter((s: any) => s.status === 'DIPINJAM_TEKNISI').length;
    const modemsRusak = (data.modemSns || []).filter((s: any) => s.status === 'RUSAK').length;
    const elapsed = Date.now() - reqStart;

    console.log(`[${getTimestampWIB()}] [SYNC:GET] ✅ 200 OK (${elapsed}ms) -> ${data.items.length} Barang, ${data.modemSns.length} Modem SN (${modemsAvail} Tersedia, ${modemsDipinjam} Dipinjam, ${modemsRusak} Rusak), ${data.transactions.length} Transaksi`);

    res.json(data);
  } catch (err: any) {
    const elapsed = Date.now() - reqStart;
    console.error(`[${getTimestampWIB()}] [SYNC:GET] ❌ Fatal Error (${elapsed}ms):`, err?.message || err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const reqStart = Date.now();
  try {
    const d = req.body;
    const deletedIds = d.deletedIds || [];
    
    console.log(`[${getTimestampWIB()}] [SYNC:POST] Menerima data sinkronisasi: items=${d.items?.length || 0}, modemSns=${d.modemSns?.length || 0}, txs=${d.transactions?.length || 0}, deleted=${deletedIds.length}`);

    await db.transaction(async (tx) => {
      const syncTable = async (tableDef: any, records: any[], tableName: string, recordsToDelete: string[] = []) => {
        // Always process deletions even if records is empty
        if (recordsToDelete && recordsToDelete.length > 0) {
            await tx.delete(tableDef).where(inArray(tableDef.id, recordsToDelete));
        }

        if (!records || !Array.isArray(records) || records.length === 0) return;
        
        // Deduplicate and sanitize
        const uniqueRecords = [];
        const seen = new Set();
        for (let r of records) {
          if (r && r.id && !seen.has(r.id)) {
            seen.add(r.id);
            
            // Sanitize timestamps (empty strings to null)
            const cleanRecord = { ...r };
            for (const key in cleanRecord) {
                if (cleanRecord[key] === '') {
                    cleanRecord[key] = null;
                }
            }
            
            uniqueRecords.push(cleanRecord);
          }
        }
        
        if (uniqueRecords.length === 0) return;

        // If syncing users table, protect existing passwords from being overwritten with null/empty
        if (tableName === "users") {
          try {
            const existingUsers = await tx.select({ id: schema.users.id, password: schema.users.password }).from(schema.users);
            const pwdMap = new Map<string, string>();
            for (const u of existingUsers) {
              if (u.id && u.password) pwdMap.set(u.id, u.password);
            }
            for (const u of uniqueRecords) {
              if (!u.password && pwdMap.has(u.id)) {
                u.password = pwdMap.get(u.id);
              }
            }
          } catch (pwdErr) {
            console.warn("Failed retrieving existing passwords for protection:", pwdErr);
          }
        }
        
        // ONLY delete the records we are replacing, so we don't erase other admins' concurrent new records!
        const payloadIds = uniqueRecords.map(r => r.id);
        
        if (payloadIds.length > 0) {
            await tx.delete(tableDef).where(inArray(tableDef.id, payloadIds));
        }
        
        try {
          await tx.insert(tableDef).values(uniqueRecords);
        } catch (err: any) {
          if (err?.code === '42703') {
            try {
              await runSelfHealMigrations();
              await tx.insert(tableDef).values(uniqueRecords);
              return;
            } catch (retryErr) {
              console.warn(`Retry insert into ${tableName} after migration failed:`, retryErr);
            }
          }
          console.error(`[${getTimestampWIB()}] [SYNC:ERROR] Gagal insert tabel ${tableName}: ${err.message}`);
          if (err.cause) console.error("CAUSE:", err.cause);
          throw err;
        }
      };

      await syncTable(schema.users, d.users, "users", deletedIds);
      await syncTable(schema.teams, d.teams, "teams", deletedIds);
      await syncTable(schema.technicians, d.technicians, "technicians", deletedIds);
      await syncTable(schema.items, d.items, "items", deletedIds);
      await syncTable(schema.modemSns, d.modemSns, "modemSns", deletedIds);
      await syncTable(schema.transactions, d.transactions, "transactions", deletedIds);
      await syncTable(schema.categories, d.categories, "categories", deletedIds);
      await syncTable(schema.units, d.units, "units", deletedIds);
      await syncTable(schema.suppliers, d.suppliers, "suppliers", deletedIds);
      await syncTable(schema.projects, d.projects, "projects", deletedIds);
      await syncTable(schema.batches, d.batches, "batches", deletedIds);
      await syncTable(schema.cableUsages, d.cableUsages, "cableUsages", deletedIds);
      await syncTable(schema.requisitions, d.requisitions, "requisitions", deletedIds);
      await syncTable(schema.opnames, d.opnames, "opnames", deletedIds);
      await syncTable(schema.auditLogs, d.auditLogs, "auditLogs", deletedIds);
      await syncTable(schema.teamMaterials, d.teamMaterials, "teamMaterials", deletedIds);
    });

    const elapsed = Date.now() - reqStart;
    console.log(`[${getTimestampWIB()}] [SYNC:POST] ✅ Sukses menyimpan sinkronisasi ke database (${elapsed}ms)`);
    res.json({ success: true });
  } catch (err: any) {
    const elapsed = Date.now() - reqStart;
    console.error(`[${getTimestampWIB()}] [SYNC:POST] ❌ Error (${elapsed}ms):`, err?.message || err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
