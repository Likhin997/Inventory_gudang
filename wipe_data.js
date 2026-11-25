const fs = require('fs');

const path = 'src/data/mockSeedData.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the start of SEED_TEAMS
const teamIdx = content.indexOf('export const SEED_TEAMS: Team[] = [');

if (teamIdx !== -1) {
  content = content.substring(0, teamIdx);
  content += `export const SEED_TEAMS: Team[] = [];
export const SEED_TECHNICIANS: Technician[] = [];
export const SEED_CATEGORIES: Category[] = [];
export const SEED_UNITS: Unit[] = [];
export const SEED_SUPPLIERS: Supplier[] = [];
export const SEED_PROJECTS: Project[] = [];
export const SEED_ITEMS: Item[] = [];
export const SEED_BATCHES: ItemBatch[] = [];
export const SEED_MODEM_SNS: ModemSerialNumber[] = [];
export const SEED_CABLE_USAGE: CableUsage[] = [];
export const SEED_TRANSACTIONS: StockTransaction[] = [];
export const SEED_REQUISITIONS: RequisitionApproval[] = [];
export const SEED_OPNAMES: StockOpname[] = [];
export const SEED_NOTIFICATIONS: AppNotification[] = [];
export const SEED_AUDIT_LOGS: AuditLog[] = [];
`;
  fs.writeFileSync(path, content);
}
