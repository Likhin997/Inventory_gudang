import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    await db.transaction(async (tx) => {
      // Delete all transactions and logs
      await tx.delete(schema.transactions);
      await tx.delete(schema.cableUsages);
      await tx.delete(schema.requisitions);
      await tx.delete(schema.opnames);
      await tx.delete(schema.batches);
      await tx.delete(schema.modemSns);
      await tx.delete(schema.teamMaterials);
      
      // We don't delete items, but we set their currentStock to 0
      const items = await tx.select().from(schema.items);
      for (const item of items) {
        await tx.update(schema.items)
          .set({ currentStock: 0 })
          .where(eq(schema.items.id, item.id));
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/reset error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
