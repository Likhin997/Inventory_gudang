export type ItemCategoryType = 'MODEM' | 'KABEL' | 'BARANG_UMUM' | 'BARANG_TEKNISI' | 'AKSESORIS' | 'PASIF' | 'QUANTITY' | 'DISMANTLE';

export type ModemStatus = 
  | 'AVAILABLE' 
  | 'RESERVED' 
  | 'DIPINJAM_TEKNISI' 
  | 'TERPASANG' 
  | 'RUSAK' 
  | 'HILANG' 
  | 'RETUR'
  | 'PERGANTIAN_MODEM'
  | 'DISMANTLE'
  | 'DIPINJAM_PINANG';

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'DISPATCHED';

export type RequisitionStatus = ApprovalStatus;

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'GUDANG' | 'TEKNISI';

export interface User {
  id: string;
  username: string;
  password?: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}



export interface Team {
  id: string;
  name: string;
  leader: string;
  members: string[]; // array of technician IDs
  description?: string;
  isActive: boolean;
}

export interface Technician {
  id: string;
  nik: string;
  name: string;
  phone: string;
  teamId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  email?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  type: ItemCategoryType;
  description: string;
  itemCount?: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  status: 'ONGOING' | 'COMPLETED' | 'PLANNED';
  startDate?: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryType: ItemCategoryType;
  brand: string;
  model: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  location: string;
  defaultPrice: number;
  description: string;
  isSerialTracked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemBatch {
  id: string;
  batchNumber: string;
  itemId: string;
  itemName: string;
  supplierId: string;
  supplierName: string;
  dateIn: string;
  invoiceNumber: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  isFinished?: boolean;
  availableCount: number;
  outCount: number;
  brokenCount: number;
  installedCount: number;
}

export interface ModemSNLog {
  id: string;
  timestamp: string;
  action: string;
  fromStatus?: ModemStatus;
  toStatus: ModemStatus;
  techName?: string;
  projectName?: string;
  notes: string;
  isFinished?: boolean;
  performedBy: string;
}

export interface ModemSerialNumber {
  id: string;
  itemId: string;
  itemName: string;
  brand: string;
  model: string;
  batchId: string;
  batchNumber: string;
  serialNumber: string;
  macAddress?: string;
  status: ModemStatus;
  location: string;
  dateIn: string;
  supplierName: string;
  price: number;
  notes: string;
  isFinished?: boolean;
  assignedTechId?: string;
  assignedTechName?: string;
  projectName?: string;
  purpose?: string;
  customerName?: string;
  customerAddress?: string;
  teamId?: string;
  teamName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  installedDate?: string;
  opticalPower?: string; // redaman
  odpPort?: string;
  installationPhoto?: string;
  installationType?: string; // 'PSB' | 'Pergantian Modem'
  keterangan?: string; // 'PSB' | 'Pergantian Modem'
  history: ModemSNLog[];
}

export interface CableStock {
  id: string;
  itemId: string;
  totalMeters: number;
  reservedMeters: number;
  availableMeters: number;
  minStockMeters: number;
  spoolNumber?: string;
}

export interface CableUsage {
  id: string;
  itemId: string;
  itemName: string;
  techId: string;
  techName: string;
  teamId?: string;
  teamName?: string;
  customerName?: string;
  metersUsed: number;
  date: string;
  project: string;
  purpose: string;
  notes: string;
  isFinished?: boolean;
  performedBy: string;
}

export type CableUsageLog = CableUsage;

export interface StockTransaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  date: string;
  itemId: string;
  itemName: string;
  categoryType: ItemCategoryType;
  quantity: number;
  unit: string;
  techId?: string;
  techName?: string;
  teamId?: string;
  teamName?: string;
  customerName?: string;
  project?: string;
  purpose?: string;
  invoiceNumber?: string;
  batchNumber?: string;
  supplierName?: string;
  serialNumbers?: string[];
  notes: string;
  isFinished?: boolean;
  stockBefore: number;
  stockAfter: number;
  performedBy: string;
  status: 'COMPLETED' | 'CANCELLED';
  approvalId?: string;
}

export interface StockOpnameDetail {
  id: string;
  itemId: string;
  itemCode?: string;
  itemName: string;
  categoryType: ItemCategoryType;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  notes: string;
  isFinished?: boolean;
  serialNumbersChecked?: string[];
  missingSerialNumbers?: string[];
}

export type StockOpnameItem = StockOpnameDetail;

export interface StockOpname {
  id: string;
  opnameNumber: string;
  date: string;
  status: 'DRAFT' | 'COMPLETED';
  categoryFilter?: string;
  performedBy: string;
  verifiedBy?: string;
  notes: string;
  isFinished?: boolean;
  itemsCheckedCount: number;
  totalDifference: number;
  details: StockOpnameDetail[];
  items?: StockOpnameDetail[];
  createdAt: string;
  completedAt?: string;
}

export interface RequisitionItem {
  itemId: string;
  itemName: string;
  categoryType: ItemCategoryType;
  quantity: number;
  unit: string;
  selectedSerialNumbers?: string[];
}

export interface RequisitionApproval {
  id: string;
  reqNumber: string;
  requisitionNumber?: string;
  date: string;
  techId: string;
  techName: string;
  project: string;
  purpose: string;
  notes?: string;
  items: RequisitionItem[];
  status: ApprovalStatus;
  supervisorNotes?: string;
  approvalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  completedBy?: string;
  completedAt?: string;
}

export type ItemRequisition = RequisitionApproval;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'STOCK_IN' | 'STOCK_OUT' | 'APPROVAL_PENDING' | 'OPNAME_DONE' | 'SYSTEM';
  read: boolean;
  timestamp: string;
  linkTab?: string;
  metadata?: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  requireApprovalForOut: boolean;
  defaultMinStock: number;
  allowNegativeStock: boolean;
  autoGenerateBatch: boolean;
  notifyLowStock: boolean;
}

export interface TeamMaterial {
  id: string;
  itemId: string;
  itemName: string;
  teamId: string;
  teamName: string;
  techId: string;
  techName: string;
  quantity: number;
  unit: string;
  status: 'SISA' | 'HABIS';
  dateIssued: string;
  dateDepleted?: string | null;
  notes?: string;
}

