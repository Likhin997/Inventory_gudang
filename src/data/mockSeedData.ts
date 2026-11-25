import {
  User,
  Technician,
  Category,
  Unit,
  Supplier,
  Project,
  Item,
  ItemBatch,
  ModemSerialNumber,
  StockTransaction,
  CableUsage,
  StockOpname,
  RequisitionApproval,
  AppNotification,
  AuditLog,
  SystemSettings
} from '../types/inventory';

export const SEED_USERS: User[] = [];
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
export const INITIAL_SETTINGS: SystemSettings = {
  companyName: 'PT. ISP Nusantara',
  companyAddress: 'Gedung Cyber, Lt 3. Jakarta Selatan',
  requireApprovalForOut: true,
  defaultMinStock: 5,
  allowNegativeStock: false,
  autoGenerateBatch: true,
  notifyLowStock: true
};
