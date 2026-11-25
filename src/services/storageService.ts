import {
  User,
  Team,
  TeamMaterial,
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
  SystemSettings,
  ModemStatus
} from '../types/inventory';
import { logger } from '../utils/logger';
import {
  SEED_USERS,
  
  SEED_TECHNICIANS,
  SEED_CATEGORIES,
  SEED_UNITS,
  SEED_SUPPLIERS,
  SEED_PROJECTS,
  SEED_ITEMS,
  SEED_BATCHES,
  SEED_MODEM_SNS,
  SEED_CABLE_USAGE,
  SEED_TRANSACTIONS,
  SEED_REQUISITIONS,
  SEED_OPNAMES,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
  INITIAL_SETTINGS
} from '../data/mockSeedData';

export class InventoryService {
  private static instance: InventoryService;
  private isSyncing = false;
  private syncTimeout: any = null;
  private lastDataFingerprint: string = '';

  public settings: SystemSettings = INITIAL_SETTINGS;
  public currentUser: User = { id: 'dummy', name: 'Loading', role: 'SUPERADMIN', email: '', active: true, username: 'admin', createdAt: new Date().toISOString() };
  public users: User[] = [];
  public teams: Team[] = [];
  public teamMaterials: TeamMaterial[] = [];
  public technicians: Technician[] = [];
  public categories: Category[] = [];
  public units: Unit[] = [];
  public suppliers: Supplier[] = [];
  public projects: Project[] = [];
  public items: Item[] = [];
  public batches: ItemBatch[] = [];
  public modemSNs: ModemSerialNumber[] = [];
  public cableUsages: CableUsage[] = [];
  public transactions: StockTransaction[] = [];
  public requisitions: RequisitionApproval[] = [];
  public opnames: StockOpname[] = [];
  public notifications: AppNotification[] = [];
  public auditLogs: AuditLog[] = [];
  public deletedIds: string[] = [];

  private listeners: (() => void)[] = [];

  private constructor() {
    // Load stored user or settings if available
    try {
      const storedSettings = localStorage.getItem('isp_inventory_settings_v2');
      if (storedSettings) this.settings = JSON.parse(storedSettings);
      
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) this.currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.warn('Error reading localStorage settings', e);
    }

    // Smart background polling: every 5s, paused when tab is inactive
    setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this.isSyncing) return;
      this.syncFromApi();
    }, 5000);

    // Instant sync when user switches back to this browser tab
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.isSyncing) {
          this.syncFromApi();
        }
      });
    }
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public async syncFromApi() {
    if (typeof window === 'undefined' || this.isSyncing) return;
    try {
      const response = await fetch('/api/sync');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) return;
      
      if (!response.ok) throw new Error('Failed to fetch from API');
      const data = await response.json();
      
      // Fast fingerprint check to avoid unnecessary re-renders when nothing changed
      const stockSum = (data.items || []).reduce((acc: number, curr: any) => acc + (Number(curr.currentStock) || 0), 0);
      const fp = `${(data.items||[]).length}-${stockSum}-${(data.modemSns||[]).length}-${(data.transactions||[]).length}-${(data.requisitions||[]).length}-${(data.teamMaterials||[]).length}-${(data.teams||[]).length}-${(data.technicians||[]).length}-${(data.users||[]).length}-${(data.auditLogs||[]).length}`;
      if (fp === this.lastDataFingerprint && this.lastDataFingerprint !== '') {
        return; // Data has not changed, skip re-render
      }
      this.lastDataFingerprint = fp;

      this.users = Array.isArray(data.users) && data.users.length > 0 ? data.users : this.users;
      this.teamMaterials = Array.isArray(data.teamMaterials) ? data.teamMaterials : [];
      this.teams = Array.isArray(data.teams) ? data.teams : [];
      this.technicians = Array.isArray(data.technicians) ? data.technicians : [];
      this.categories = Array.isArray(data.categories) ? data.categories : [];
      this.units = Array.isArray(data.units) ? data.units : [];
      this.items = Array.isArray(data.items) ? data.items : [];
      this.modemSNs = Array.isArray(data.modemSns) ? data.modemSns : [];
      this.transactions = Array.isArray(data.transactions) ? data.transactions : [];
      this.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
      this.projects = Array.isArray(data.projects) ? data.projects : [];
      this.batches = Array.isArray(data.batches) ? data.batches : [];
      this.cableUsages = Array.isArray(data.cableUsages) ? data.cableUsages : [];
      this.requisitions = Array.isArray(data.requisitions) ? data.requisitions : [];
      this.opnames = Array.isArray(data.opnames) ? data.opnames : [];
      this.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
      
      // If user is already authenticated in session, sync user info with fresh database data
      if (this.currentUser && this.currentUser.id && this.currentUser.id !== 'dummy') {
        const freshUser = this.users.find(u => u.id === this.currentUser.id || u.username === this.currentUser.username);
        if (freshUser) {
          this.currentUser = freshUser;
        }
      }

      this.recalculateBatchCounters();
      this.notify();
      logger.addLog(
        'info',
        'Storage:SyncSuccess',
        `Sinkronisasi sukses: ${this.items.length} master barang, ${this.modemSNs.length} SN modem (${this.modemSNs.filter(s => s.status === 'AVAILABLE').length} AVAILABLE).`,
        { items: this.items.length, modems: this.modemSNs.length }
      );
    } catch (err: any) {
      console.warn("syncFromApi delayed:", err);
      logger.addLog('error', 'Storage:SyncFailed', err?.message || 'Gagal sinkronisasi data dari API backend', err, err?.stack);
    }
  }
  
  public async syncToApi() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const data = {
        users: this.users,
        teams: this.teams,
        teamMaterials: this.teamMaterials,
        technicians: this.technicians,
        items: this.items,
        modemSns: this.modemSNs,
        transactions: this.transactions,
        categories: this.categories,
        units: this.units,
        suppliers: this.suppliers,
        projects: this.projects,
        batches: this.batches,
        cableUsages: this.cableUsages,
        requisitions: this.requisitions,
        opnames: this.opnames,
        auditLogs: this.auditLogs,
        deletedIds: this.deletedIds,
      };
      
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status} gagal menyimpan perubahan`);
      }
      // Clear deleted IDs after successful sync
      this.deletedIds = [];
    } catch (err: any) {
      console.error("syncToApi error", err);
      logger.addLog('error', 'Storage:SyncToApiFailed', err?.message || 'Gagal menyimpan perubahan ke database backend', err, err?.stack);
    } finally {
      this.isSyncing = false;
    }
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  public persistAll(): void {
    this.notify();
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.syncToApi().catch(err => console.error("API Sync failed:", err));
    }, 100);
  }

  public resetToDefault(): void {
    this.settings = { ...INITIAL_SETTINGS };
    this.users = [...SEED_USERS];
    this.currentUser = this.users[0];
    this.teams = [];
    this.teamMaterials = [];
    this.technicians = [...SEED_TECHNICIANS];
    this.categories = [...SEED_CATEGORIES];
    this.units = [...SEED_UNITS];
    this.suppliers = [...SEED_SUPPLIERS];
    this.projects = [...SEED_PROJECTS];
    this.items = [...SEED_ITEMS];
    this.batches = [...SEED_BATCHES];
    this.modemSNs = [...SEED_MODEM_SNS];
    this.cableUsages = [...SEED_CABLE_USAGE];
    this.transactions = [...SEED_TRANSACTIONS];
    this.requisitions = [...SEED_REQUISITIONS];
    this.opnames = [...SEED_OPNAMES];
    this.notifications = [...SEED_NOTIFICATIONS];
    this.auditLogs = [...SEED_AUDIT_LOGS];
    this.recalculateBatchCounters();
    this.persistAll();
  }

  public switchUser(userId: string): void {
    const found = this.users.find(u => u.id === userId);
    if (found) {
      this.currentUser = found;
      this.logAudit('USER_SWITCH', 'USER', found.id, `Beralih peran menjadi: ${found.name} (${found.role})`);
      this.persistAll();
    }
  }

  public updateSettings(newSettings: Partial<SystemSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.logAudit('SETTINGS_UPDATE', 'SETTINGS', 'global', 'Memperbarui konfigurasi sistem');
    this.persistAll();
  }

  public logAudit(action: string, entity: string, entityId: string, details: string): void {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      role: this.currentUser.role,
      action,
      entity,
      entityId,
      details,
      ipAddress: '192.168.1.100'
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
  }

  public addNotification(
    title: string,
    message: string,
    type: AppNotification['type'],
    linkTab?: string,
    metadata?: any
  ): void {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      linkTab,
      metadata
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    this.persistAll();
  }

  public markNotificationAsRead(id: string): void {
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.persistAll();
    }
  }

  public markAllNotificationsRead(): void {
    this.notifications.forEach(n => { n.read = true; });
    this.persistAll();
  }

  public recalculateBatchCounters(): void {
    this.batches.forEach(batch => {
      const sns = this.modemSNs.filter(s => s.batchId === batch.id || s.batchNumber === batch.batchNumber);
      batch.quantity = sns.length || batch.quantity;
      batch.availableCount = sns.filter(s => s.status === 'AVAILABLE').length;
      batch.outCount = sns.filter(s => ['DIPINJAM_TEKNISI', 'TERPASANG', 'RESERVED'].includes(s.status)).length;
      batch.brokenCount = sns.filter(s => ['RUSAK', 'HILANG', 'RETUR'].includes(s.status)).length;
      batch.installedCount = sns.filter(s => s.status === 'TERPASANG').length;
    });

    // Keep ONT RUSAK master item stock in sync with actual broken modem serial numbers
    const rusakItem = this.items.find(i => 
      i.name.trim().toUpperCase() === 'ONT RUSAK' ||
      i.name.toUpperCase().includes('ONT RUSAK') ||
      (i.name.toUpperCase().includes('RUSAK') && (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE'))
    );
    if (rusakItem) {
      const actualRusakCount = this.modemSNs.filter(s => s.itemId === rusakItem.id && (s.status === 'RUSAK' || s.status === 'AVAILABLE')).length;
      if (actualRusakCount > 0 && rusakItem.currentStock !== actualRusakCount) {
        rusakItem.currentStock = actualRusakCount;
      }
    }
  }

  // --- ITEM MANAGEMENT ---
  public getItemById(id: string): Item | undefined {
    return this.items.find(i => i.id === id);
  }

  public createItem(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Item {
    const newItem: Item = {
      ...data,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.push(newItem);
    this.logAudit('ITEM_CREATE', 'ITEM', newItem.id, `Menambahkan master barang baru: ${newItem.name} (${newItem.code})`);
    this.persistAll();
    return newItem;
  }

  public updateItem(id: string, data: Partial<Item>): Item {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Barang tidak ditemukan');
    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.logAudit('ITEM_UPDATE', 'ITEM', id, `Mengubah data master barang: ${this.items[index].name}`);
    this.persistAll();
    return this.items[index];
  }

  public deleteItem(id: string): void {
    this.deletedIds.push(id);
    const item = this.getItemById(id);
    if (!item) return;
    this.items = this.items.filter(i => i.id !== id);
    this.logAudit('ITEM_DELETE', 'ITEM', id, `Menghapus master barang: ${item.name}`);
    this.persistAll();
  }

  // --- MUTASI / TRANSFER STOK ANTAR BARANG ---
  public transferItemStock(params: {
    fromItemId: string;
    toItemId: string;
    quantity: number;
    serialNumbers?: string[];
    notes?: string;
  }): { fromItem: Item; toItem: Item; movedSNs: string[] } {
    const fromItem = this.getItemById(params.fromItemId);
    if (!fromItem) throw new Error('Barang asal tidak ditemukan!');

    const toItem = this.getItemById(params.toItemId);
    if (!toItem) throw new Error('Barang tujuan tidak ditemukan!');

    if (fromItem.id === toItem.id) {
      throw new Error('Barang asal dan barang tujuan tidak boleh sama!');
    }

    const qty = Math.max(1, Math.floor(params.quantity));
    const fromCurrent = Number(fromItem.currentStock) || 0;
    if (fromCurrent < qty) {
      throw new Error(`Stok barang asal (${fromItem.name}) tidak mencukupi! Tersedia: ${fromCurrent}, Diminta: ${qty}`);
    }

    const movedSNs: string[] = [];
    const isFromModem = fromItem.isSerialTracked || fromItem.categoryType === 'MODEM';
    const isToModem = toItem.isSerialTracked || toItem.categoryType === 'MODEM';

    // If either item tracks serial numbers, handle SN updates
    if (isFromModem || isToModem) {
      const candidateSNs = this.modemSNs.filter(s =>
        (s.itemId === fromItem.id || (s.itemName && s.itemName.toLowerCase() === fromItem.name.toLowerCase())) &&
        s.status === 'AVAILABLE'
      );

      let targetSNs: ModemSerialNumber[] = [];
      if (params.serialNumbers && params.serialNumbers.length > 0) {
        const cleanSNSet = new Set(params.serialNumbers.map(s => s.trim().toUpperCase()));
        targetSNs = this.modemSNs.filter(s => cleanSNSet.has(s.serialNumber.toUpperCase()));
        if (targetSNs.length !== params.serialNumbers.length) {
          throw new Error('Sebagian Serial Number yang dipilih tidak ditemukan dalam sistem!');
        }
      } else if (candidateSNs.length >= qty) {
        targetSNs = candidateSNs.slice(0, qty);
      }

      for (const sn of targetSNs) {
        const prevItemName = sn.itemName;
        sn.itemId = toItem.id;
        sn.itemName = toItem.name;
        if (toItem.brand) sn.brand = toItem.brand;
        if (toItem.model) sn.model = toItem.model;

        if (!sn.history) sn.history = [];
        sn.history.unshift({
          id: `snlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          action: `Pindah Master Barang dari ${prevItemName} ke ${toItem.name}`,
          fromStatus: sn.status,
          toStatus: sn.status,
          notes: params.notes || `Mutasi stok barang dari ${fromItem.name} ke ${toItem.name}`,
          performedBy: this.currentUser.name
        });
        movedSNs.push(sn.serialNumber);
      }
    }

    const fromStockBefore = fromCurrent;
    fromItem.currentStock = Math.max(0, fromCurrent - qty);
    fromItem.updatedAt = new Date().toISOString();

    const toStockBefore = Number(toItem.currentStock) || 0;
    toItem.currentStock = toStockBefore + qty;
    toItem.updatedAt = new Date().toISOString();

    const timestamp = new Date().toISOString();
    const trxNumberOut = `TRX-MUT-OUT-${Date.now().toString().slice(-6)}`;
    const trxNumberIn = `TRX-MUT-IN-${Date.now().toString().slice(-6)}`;

    const trxOut: StockTransaction = {
      id: `trx-${Date.now()}-out`,
      transactionNumber: trxNumberOut,
      type: 'TRANSFER',
      date: timestamp,
      itemId: fromItem.id,
      itemName: fromItem.name,
      categoryType: fromItem.categoryType,
      quantity: -qty,
      unit: fromItem.unit,
      serialNumbers: movedSNs.length > 0 ? movedSNs : undefined,
      notes: `Pindah stok ke [${toItem.name}]: ${params.notes || ''}`.trim(),
      stockBefore: fromStockBefore,
      stockAfter: fromItem.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED'
    };

    const trxIn: StockTransaction = {
      id: `trx-${Date.now()}-in`,
      transactionNumber: trxNumberIn,
      type: 'TRANSFER',
      date: timestamp,
      itemId: toItem.id,
      itemName: toItem.name,
      categoryType: toItem.categoryType,
      quantity: qty,
      unit: toItem.unit,
      serialNumbers: movedSNs.length > 0 ? movedSNs : undefined,
      notes: `Pindah stok dari [${fromItem.name}]: ${params.notes || ''}`.trim(),
      stockBefore: toStockBefore,
      stockAfter: toItem.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED'
    };

    this.transactions.unshift(trxIn);
    this.transactions.unshift(trxOut);

    this.logAudit(
      'STOCK_TRANSFER',
      'ITEM',
      toItem.id,
      `Pindah stok ${qty} ${fromItem.unit} dari [${fromItem.name}] ke [${toItem.name}].${movedSNs.length > 0 ? ` SN: ${movedSNs.join(', ')}.` : ''} Catatan: ${params.notes || '-'}`
    );

    this.addNotification(
      `🔄 Pindah Stok: ${fromItem.name} → ${toItem.name}`,
      `Berhasil memindahkan ${qty} ${fromItem.unit} ke ${toItem.name}.${movedSNs.length > 0 ? ` (${movedSNs.length} Serial Number diperbarui)` : ''}`,
      'STOCK_IN',
      'inventory-all'
    );

    this.persistAll();
    return { fromItem, toItem, movedSNs };
  }

  public transferModemSNsToItem(params: {
    serialNumbers: string[];
    targetItemId: string;
    notes?: string;
  }): { targetItem: Item; movedCount: number; sourceItemNames: string[] } {
    const targetItem = this.getItemById(params.targetItemId);
    if (!targetItem) throw new Error('Barang tujuan tidak ditemukan!');

    if (!params.serialNumbers || params.serialNumbers.length === 0) {
      throw new Error('Pilih minimal satu Serial Number yang akan dipindahkan!');
    }

    const cleanSNSet = new Set(params.serialNumbers.map(s => s.trim().toUpperCase()));
    const matchingSNs = this.modemSNs.filter(s => cleanSNSet.has(s.serialNumber.toUpperCase()));

    if (matchingSNs.length === 0) {
      throw new Error('Serial Number yang dipilih tidak ditemukan dalam sistem!');
    }

    // Group SNs by their original itemId
    const countBySourceItemId: Record<string, { count: number; name: string }> = {};
    for (const sn of matchingSNs) {
      const srcId = sn.itemId || 'unknown';
      if (!countBySourceItemId[srcId]) {
        const itemObj = this.getItemById(srcId);
        countBySourceItemId[srcId] = {
          count: 0,
          name: itemObj?.name || sn.itemName || 'Barang Asal'
        };
      }
      countBySourceItemId[srcId].count += 1;
    }

    // Decrement stock on each source item and record OUT transaction
    const timestamp = new Date().toISOString();
    const sourceNames: string[] = [];

    for (const [srcId, info] of Object.entries(countBySourceItemId)) {
      sourceNames.push(info.name);
      const srcItem = this.getItemById(srcId);
      if (srcItem) {
        const beforeStock = Number(srcItem.currentStock) || 0;
        srcItem.currentStock = Math.max(0, beforeStock - info.count);
        srcItem.updatedAt = timestamp;

        this.transactions.unshift({
          id: `trx-${Date.now()}-out-${srcId.slice(-4)}`,
          transactionNumber: `TRX-MUT-OUT-${Date.now().toString().slice(-6)}`,
          type: 'TRANSFER',
          date: timestamp,
          itemId: srcItem.id,
          itemName: srcItem.name,
          categoryType: srcItem.categoryType,
          quantity: -info.count,
          unit: srcItem.unit,
          serialNumbers: matchingSNs.filter(s => s.itemId === srcId).map(s => s.serialNumber),
          notes: `Pindah ${info.count} unit ke [${targetItem.name}]: ${params.notes || ''}`.trim(),
          stockBefore: beforeStock,
          stockAfter: srcItem.currentStock,
          performedBy: this.currentUser.name,
          status: 'COMPLETED'
        });
      }
    }

    // Increment target item stock and record IN transaction
    const targetStockBefore = Number(targetItem.currentStock) || 0;
    targetItem.currentStock = targetStockBefore + matchingSNs.length;
    targetItem.updatedAt = timestamp;

    this.transactions.unshift({
      id: `trx-${Date.now()}-in`,
      transactionNumber: `TRX-MUT-IN-${Date.now().toString().slice(-6)}`,
      type: 'TRANSFER',
      date: timestamp,
      itemId: targetItem.id,
      itemName: targetItem.name,
      categoryType: targetItem.categoryType,
      quantity: matchingSNs.length,
      unit: targetItem.unit,
      serialNumbers: matchingSNs.map(s => s.serialNumber),
      notes: `Pindah ${matchingSNs.length} unit dari [${sourceNames.join(', ')}]: ${params.notes || ''}`.trim(),
      stockBefore: targetStockBefore,
      stockAfter: targetItem.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED'
    });

    // Update each modem SN object
    for (const sn of matchingSNs) {
      const prevName = sn.itemName;
      sn.itemId = targetItem.id;
      sn.itemName = targetItem.name;
      if (targetItem.brand) sn.brand = targetItem.brand;
      if (targetItem.model) sn.model = targetItem.model;

      if (!sn.history) sn.history = [];
      sn.history.unshift({
        id: `snlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        action: `Pindah Master Barang dari ${prevName} ke ${targetItem.name}`,
        fromStatus: sn.status,
        toStatus: sn.status,
        notes: params.notes || `Pindah master barang ke ${targetItem.name}`,
        performedBy: this.currentUser.name
      });
    }

    this.logAudit(
      'STOCK_TRANSFER',
      'ITEM',
      targetItem.id,
      `Pindah ${matchingSNs.length} unit Serial Number ke [${targetItem.name}] dari [${sourceNames.join(', ')}]. Catatan: ${params.notes || '-'}`
    );

    this.addNotification(
      `🔄 Pindah Master Barang: → ${targetItem.name}`,
      `Berhasil memindahkan ${matchingSNs.length} Serial Number ke ${targetItem.name}.`,
      'STOCK_IN',
      'modems-all'
    );

    this.persistAll();
    return { targetItem, movedCount: matchingSNs.length, sourceItemNames: sourceNames };
  }

  // --- STOCK IN (BARANG MASUK) ---
  public processStockIn(params: {
    itemId: string;
    supplierId?: string;
    invoiceNumber: string;
    batchNumber?: string;
    quantity: number;
    unitPrice?: number;
    date?: string;
    notes?: string;
    serialNumbers?: { sn: string; mac?: string }[];
    customerName?: string;
    teamId?: string;
    teamName?: string;
  }): StockTransaction {
    const item = this.getItemById(params.itemId);
    if (!item) throw new Error('Barang tidak valid!');

    const stockBefore = Number(item.currentStock) || 0;
    const qty = Number(params.quantity);
    if (qty <= 0) throw new Error('Quantity masuk harus lebih dari 0!');

    let createdBatch: ItemBatch | undefined;

    const itemNameUpper = (item.name || '').toUpperCase();
    const isDismantle = item.categoryType === 'DISMANTLE' || itemNameUpper.includes('DISMANTLE') || itemNameUpper.includes('DISMANTEL') || itemNameUpper.includes('PENARIKAN');
    const isPergantian = itemNameUpper.includes('PERGANTIAN');

    // If Modem with Serial Numbers
    if ((item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE' || isDismantle || isPergantian)) {
      if (!params.serialNumbers || params.serialNumbers.length !== qty) {
        throw new Error(`Modem wajib memiliki Serial Number yang sesuai dengan jumlah (${qty} SN).`);
      }

      // Check unique SN in whole database
      const existingSNs = new Set(this.modemSNs.map(s => s.serialNumber.toUpperCase()));
      const duplicateInPayload = new Set<string>();

      for (const itemSN of params.serialNumbers) {
        const cleanSN = itemSN.sn.trim().toUpperCase();
        if (!cleanSN) throw new Error('Serial Number tidak boleh kosong!');
        if (existingSNs.has(cleanSN)) {
          throw new Error(`Serial Number duplicate terdeteksi di sistem: ${cleanSN}`);
        }
        if (duplicateInPayload.has(cleanSN)) {
          throw new Error(`Serial Number duplicate dalam daftar input: ${cleanSN}`);
        }
        duplicateInPayload.add(cleanSN);
      }

      // Create Batch
      const batchCode = params.batchNumber || `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
      const supplier = this.suppliers.find(s => s.id === params.supplierId);

      const batchNotes = params.notes || (params.customerName ? `Pelanggan: ${params.customerName} | Team: ${params.teamName || '-'}` : '');

      createdBatch = {
        id: `batch-${Date.now()}`,
        batchNumber: batchCode,
        itemId: item.id,
        itemName: item.name,
        supplierId: params.supplierId || '',
        supplierName: supplier?.name || 'Supplier Umum',
        dateIn: params.date,
        invoiceNumber: params.invoiceNumber,
        quantity: qty,
        unitPrice: params.unitPrice || item.defaultPrice,
        notes: batchNotes,
        availableCount: qty,
        outCount: 0,
        brokenCount: 0,
        installedCount: 0
      };
      this.batches.unshift(createdBatch);

      const modemStatus = isDismantle ? 'DISMANTLE' : isPergantian ? 'PERGANTIAN_MODEM' : 'AVAILABLE';
      const modemLocation = isDismantle ? 'Gudang (Dismantle)' : isPergantian ? 'Gudang (Pergantian Modem)' : (item.location || 'Gudang Utama');

      // Insert all Serial Numbers
      const newSNRecords: ModemSerialNumber[] = params.serialNumbers.map(s => ({
        id: `sn-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        itemId: item.id,
        itemName: item.name,
        brand: item.brand,
        model: item.model,
        batchId: createdBatch!.id,
        batchNumber: batchCode,
        serialNumber: s.sn.trim().toUpperCase(),
        macAddress: s.mac ? s.mac.trim().toUpperCase() : undefined,
        status: modemStatus,
        location: modemLocation,
        dateIn: params.date,
        supplierName: supplier?.name || 'Supplier Utama',
        price: params.unitPrice || item.defaultPrice,
        notes: params.notes || (params.customerName ? `Pelanggan: ${params.customerName}${params.teamName ? ` | Team: ${params.teamName}` : ''}` : ''),
        customerName: params.customerName || undefined,
        teamId: params.teamId || undefined,
        teamName: params.teamName || undefined,
        assignedTeamId: params.teamId || undefined,
        assignedTeamName: params.teamName || undefined,
        assignedTechName: params.teamName || undefined,
        history: [
          {
            id: `snlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            action: isDismantle ? 'Masuk ONT Dismantel' : isPergantian ? 'Masuk ONT Pergantian' : 'Modem Masuk Batch',
            toStatus: modemStatus,
            notes: `Masuk Batch ${batchCode}, Invoice: ${params.invoiceNumber}${params.customerName ? `, Pelanggan: ${params.customerName}` : ''}${params.teamName ? `, Team: ${params.teamName}` : ''}`,
            performedBy: this.currentUser.name
          }
        ]
      }));

      this.modemSNs.push(...newSNRecords);
    }

    // Update Item Stock
    item.currentStock = Number((stockBefore + qty).toFixed(2));
    item.updatedAt = new Date().toISOString();

    const supplier = this.suppliers.find(s => s.id === params.supplierId);

    // Create Stock Transaction Record
    const trxNumber = `TRX-IN-${(params.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const trxDate = params.date || new Date().toISOString().slice(0, 10);
    const trxNotes = params.notes || (params.customerName ? `Pelanggan: ${params.customerName}${params.teamName ? ` | Team: ${params.teamName}` : ''}` : 'Penerimaan barang masuk');

    const trx: StockTransaction = {
      id: `trx-${Date.now()}`,
      transactionNumber: trxNumber,
      type: 'STOCK_IN',
      date: trxDate,
      itemId: item.id,
      itemName: item.name,
      categoryType: item.categoryType,
      quantity: qty,
      unit: item.unit,
      teamId: params.teamId,
      teamName: params.teamName,
      customerName: params.customerName,
      techName: params.teamName,
      invoiceNumber: params.invoiceNumber,
      batchNumber: createdBatch?.batchNumber || params.batchNumber,
      supplierName: supplier?.name || 'Supplier',
      serialNumbers: params.serialNumbers?.map(s => s.sn.trim().toUpperCase()),
      notes: trxNotes,
      stockBefore,
      stockAfter: item.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED'
    };

    this.transactions.unshift(trx);

    this.logAudit(
      'STOCK_IN',
      'TRANSACTION',
      trx.id,
      `Penerimaan barang masuk: ${item.name} (${qty} ${item.unit})${params.customerName ? ` [Pelanggan: ${params.customerName}]` : ''}${params.teamName ? ` [Team: ${params.teamName}]` : ''}. Stok: ${stockBefore} → ${item.currentStock}`
    );

    this.addNotification(
      `�� Barang Masuk: ${item.name}`,
      `Berhasil memasukkan ${qty} ${item.unit} (${trxNumber}).`,
      'STOCK_IN',
      'transactions'
    );

    this.recalculateBatchCounters();
    this.persistAll();
    return trx;
  }

  // --- STOCK OUT (BARANG KELUAR) ---
  public processStockOut(params: {
    itemId: string;
    
    techId: string;
    project?: string;
    purpose: string;
    quantity: number;
    date?: string;
    notes?: string;
    selectedSerialNumbers?: string[]; // required for modem
    approvalId?: string;
  }): StockTransaction {
    const item = this.getItemById(params.itemId);
    if (!item) throw new Error('Barang tidak ditemukan!');

    const tech = this.technicians.find(t => t.id === params.techId);
    const team = !tech ? this.teams.find(t => t.id === params.techId) : undefined;
    if (!tech && !team) throw new Error("Teknisi atau Tim wajib dipilih!");
    const targetId = tech ? tech.id : (team ? team.id : params.techId);
    const targetName = tech ? tech.name : (team ? team.name : params.techId);

    const qty = Number(params.quantity);
    if (qty <= 0) throw new Error('Quantity keluar harus lebih dari 0!');

    const stockBefore = Number(item.currentStock) || 0;

    if (!this.settings.allowNegativeStock && stockBefore < qty) {
      throw new Error(`Stok tidak mencukupi! Tersedia: ${stockBefore} ${item.unit}, diminta: ${qty} ${item.unit}.`);
    }

    const trxDate = params.date || new Date().toISOString().slice(0, 10);

    // Modem processing with Serial Number tracking
    if ((item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE')) {
      if (!params.selectedSerialNumbers || params.selectedSerialNumbers.length !== qty) {
        throw new Error(`Pengeluaran modem wajib menyertakan persis ${qty} Serial Number yang valid.`);
      }

      // Check all SNs are available
      for (const snString of params.selectedSerialNumbers) {
        const modemRecord = this.modemSNs.find(
          s => s.serialNumber.trim().toUpperCase() === snString.trim().toUpperCase() && (
            s.itemId === item.id || 
            !s.itemId || 
            (s.itemName && s.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())
          )
        );
        if (!modemRecord) {
          throw new Error(`Serial Number ${snString} tidak ditemukan untuk modem ${item.name}!`);
        }
        if (modemRecord.status !== 'AVAILABLE' && modemRecord.status !== 'RESERVED') {
          throw new Error(`Serial Number ${snString} sedang berstatus "${modemRecord.status}" dan tidak dapat dikeluarkan!`);
        }

        // Update SN state to DIPINJAM_TEKNISI
        modemRecord.status = 'DIPINJAM_TEKNISI';
        modemRecord.assignedTechId = targetId;
        modemRecord.assignedTechName = targetName;
        if (targetId.startsWith('team-') || team) {
          modemRecord.teamId = targetId;
          modemRecord.teamName = targetName;
          modemRecord.assignedTeamId = targetId;
          modemRecord.assignedTeamName = targetName;
        }
        modemRecord.projectName = params.project || 'Operasional Field';
        modemRecord.purpose = params.purpose;
        modemRecord.location = `Dipinjam: ${targetName}`;
        modemRecord.history.unshift({
          id: `snlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          action: 'Pengeluaran Barang ke Teknisi',
          fromStatus: 'AVAILABLE',
          toStatus: 'DIPINJAM_TEKNISI',
          
          techName: targetName,
          projectName: params.project,
          notes: `Keperluan: ${params.purpose}. ${params.notes || ''}`,
          performedBy: this.currentUser.name
        });
      }
    }

    // Tracking material per team / technician
    if (item.categoryType === 'BARANG_UMUM' || item.categoryType === 'BARANG_TEKNISI' || item.categoryType === 'AKSESORIS' || item.categoryType === 'PASIF' || item.categoryType === 'QUANTITY') {
        
        let targetId = params.techId;
        let targetName = tech?.name || '';
        
        // If it's a team, find team details
        if (!tech && params.techId.startsWith('team-')) {
            const team = this.teams.find(t => t.id === params.techId);
            if (team) {
                targetName = team.name;
            }
        }

        let teamId = 'unknown-team';
        let teamName = 'Unknown Team';
        if (targetId.startsWith('team-')) {
          teamId = targetId;
          teamName = targetName;
        }
        
        this.teamMaterials.unshift({
          id: `tmat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          itemId: item.id,
          itemName: item.name,
          teamId: teamId,
          teamName: teamName,
          techId: targetId,
          techName: targetName,
          quantity: qty,
          unit: item.unit,
          status: 'SISA',
          dateIssued: trxDate,
          notes: params.notes || ''
        });
    }

    if (item.categoryType === 'KABEL') {
      const cableLog: CableUsage = {
        id: `cu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemId: item.id,
        itemName: item.name,
        
        
        techId: targetId,
        techName: targetName,
        metersUsed: qty,
        date: trxDate,
        project: params.project || 'General Cabling Project',
        purpose: params.purpose,
        notes: params.notes || '',
        performedBy: this.currentUser.name
      };
      this.cableUsages.unshift(cableLog);
    }
    

    // Deduct stock
    item.currentStock = Number((stockBefore - qty).toFixed(2));
    item.updatedAt = new Date().toISOString();

    const trxNumber = `TRX-OUT-${trxDate.replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const trx: StockTransaction = {
      id: `trx-${Date.now()}`,
      transactionNumber: trxNumber,
      type: 'STOCK_OUT',
      date: trxDate,
      itemId: item.id,
      itemName: item.name,
      categoryType: item.categoryType,
      quantity: qty,
      unit: item.unit,
      
      
      techId: targetId,
      techName: targetName,
      teamId: team ? team.id : (targetId.startsWith('team-') ? targetId : undefined),
      teamName: team ? team.name : undefined,
      project: params.project,
      purpose: params.purpose,
      serialNumbers: params.selectedSerialNumbers?.map(s => s.toUpperCase()),
      notes: params.notes || 'Pengeluaran barang ke tim teknisi',
      stockBefore,
      stockAfter: item.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED',
      approvalId: params.approvalId
    };

    this.transactions.unshift(trx);

    this.logAudit(
      'STOCK_OUT',
      'TRANSACTION',
      trx.id,
      `Pengeluaran barang: ${item.name} (${qty} ${item.unit}) ke ${targetName}. Stok: ${stockBefore} → ${item.currentStock}`
    );

    // Check low stock alert
    if (item.currentStock <= item.minimumStock) {
      const isOutOfStock = item.currentStock <= 0;
      this.addNotification(
        isOutOfStock ? `�� STOK HABIS: ${item.name}` : `⚠️ STOK MENIPIS: ${item.name}`,
        `Stok tersisa ${item.currentStock} ${item.unit} (Batas Minimum: ${item.minimumStock} ${item.unit}). Segera lakukan pengadaan.`,
        isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        'low-stock'
      );
    }

    this.recalculateBatchCounters();
    this.persistAll();
    return trx;
  }


  public processBulkStockOut(params: {
    techIds: string[];
    teamId?: string;
    project?: string;
    purpose: string;
    date?: string;
    items: {
      itemId: string;
      quantity: number;
      notes?: string;
      selectedSerialNumbers?: string[];
    }[];
  }): StockTransaction[] {
    let techNames = '';
    let techIdString = '';
    
    if (params.teamId) {
      const team = this.teams.find(t => t.id === params.teamId);
      if (!team) throw new Error('Tim tidak ditemukan!');
      techNames = team.name;
      techIdString = team.id;
    } else {
      const selectedTechs = params.techIds.map(id => this.technicians.find(t => t.id === id)).filter(Boolean) as Technician[];
      if (selectedTechs.length === 0) throw new Error('Minimal satu Teknisi wajib dipilih!');
      techNames = selectedTechs.map(t => t.name).join(', ');
      techIdString = params.techIds.join(',');
    }

    const trxDate = params.date || new Date().toISOString().slice(0, 10);
    const trxNumber = `TRX-OUT-${trxDate.replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const transactions: StockTransaction[] = [];
    const notifications: {title: string, body: string, type: any}[] = [];

    // Pre-validation
    for (const reqItem of params.items) {
      const item = this.getItemById(reqItem.itemId);
      if (!item) throw new Error(`Barang dengan ID ${reqItem.itemId} tidak ditemukan!`);

      const qty = Number(reqItem.quantity);
      if (qty <= 0) throw new Error(`Quantity ${item.name} harus lebih dari 0!`);

      const stockBefore = Number(item.currentStock) || 0;
      if (!this.settings.allowNegativeStock && stockBefore < qty) {
        throw new Error(`Stok ${item.name} tidak mencukupi! Tersedia: ${stockBefore} ${item.unit}, diminta: ${qty} ${item.unit}.`);
      }

      if ((item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE')) {
        if (!reqItem.selectedSerialNumbers || reqItem.selectedSerialNumbers.length !== qty) {
          throw new Error(`Pengeluaran modem ${item.name} wajib menyertakan persis ${qty} Serial Number yang valid.`);
        }
        for (const snString of reqItem.selectedSerialNumbers) {
          const modemRecord = this.modemSNs.find(
            s => s.serialNumber.trim().toUpperCase() === snString.trim().toUpperCase() && (
              s.itemId === item.id || 
              !s.itemId || 
              (s.itemName && s.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())
            )
          );
          if (!modemRecord) throw new Error(`Serial Number ${snString} tidak ditemukan untuk ${item.name}!`);
          if (modemRecord.status !== 'AVAILABLE') throw new Error(`Serial Number ${snString} statusnya ${modemRecord.status} (bukan AVAILABLE)!`);
        }
      }
    }

    // Process
    for (const reqItem of params.items) {
      const item = this.getItemById(reqItem.itemId)!;
      const qty = Number(reqItem.quantity);
      const stockBefore = Number(item.currentStock) || 0;

      if ((item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE') && reqItem.selectedSerialNumbers) {
        for (const snString of reqItem.selectedSerialNumbers) {
          const modemRecord = this.modemSNs.find(
            s => s.serialNumber.trim().toUpperCase() === snString.trim().toUpperCase() && (
              s.itemId === item.id || 
              !s.itemId || 
              (s.itemName && s.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())
            )
          )!;
          modemRecord.status = 'DIPINJAM_TEKNISI';
          modemRecord.assignedTechId = techIdString;
          modemRecord.assignedTechName = techNames;
          if (params.teamId) {
            modemRecord.teamId = params.teamId;
            modemRecord.teamName = techNames;
            modemRecord.assignedTeamId = params.teamId;
            modemRecord.assignedTeamName = techNames;
          }
          modemRecord.projectName = params.project || 'Operasional Field';
          modemRecord.purpose = params.purpose;
          modemRecord.location = `Dipinjam: ${techNames}`;
          modemRecord.history.unshift({
            id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            toStatus: 'DIPINJAM_TEKNISI',
            action: 'Pengeluaran ke Teknisi',
            notes: `Dikeluarkan untuk ${techNames}`,
            performedBy: this.currentUser.name
          });
        }
      }

      if (item.categoryType === 'KABEL') {
        const cableLog = {
          id: `clog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: trxDate,
          itemId: item.id,
          itemName: item.name,
          techId: techIdString,
          techName: techNames,
          metersUsed: qty,
          project: params.project || '',
          purpose: params.purpose,
          notes: reqItem.notes || '',
          performedBy: this.currentUser.name
        };
        // Ensure this property matches the modified TS type - wait, let me just check CableUsage type later if needed.
        this.cableUsages.unshift(cableLog as any);
      }
      
      if (item.categoryType === 'BARANG_UMUM' || item.categoryType === 'BARANG_TEKNISI' || item.categoryType === 'AKSESORIS' || item.categoryType === 'PASIF' || item.categoryType === 'QUANTITY') {
        if (params.teamId) {
          this.teamMaterials.unshift({
            id: `tmat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemId: item.id,
            itemName: item.name,
            teamId: params.teamId,
            teamName: techNames,
            techId: params.teamId,
            techName: techNames,
            quantity: qty,
            unit: item.unit,
            status: 'SISA',
            dateIssued: trxDate,
            notes: reqItem.notes || ''
          });
        } else {
          // Track per technician
          const qtyPerTech = qty / params.techIds.length;
          params.techIds.forEach(tId => {
             const tName = this.technicians.find(t => t.id === tId)?.name || tId;
             this.teamMaterials.unshift({
              id: `tmat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              itemId: item.id,
              itemName: item.name,
              teamId: 'unknown-team',
              teamName: 'Unknown Team',
              techId: tId,
              techName: tName,
              quantity: qtyPerTech,
              unit: item.unit,
              status: 'SISA',
              dateIssued: trxDate,
              notes: reqItem.notes || ''
             });
          });
        }
      }

      item.currentStock = Number((stockBefore - qty).toFixed(2));
      item.updatedAt = new Date().toISOString();

      const trx: StockTransaction = {
        id: `trx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        transactionNumber: trxNumber,
        type: 'STOCK_OUT',
        date: trxDate,
        itemId: item.id,
        itemName: item.name,
        categoryType: item.categoryType,
        quantity: qty,
        unit: item.unit,
        techId: techIdString,
        techName: techNames,
        project: params.project,
        purpose: params.purpose,
        serialNumbers: reqItem.selectedSerialNumbers?.map(s => s.toUpperCase()),
        notes: reqItem.notes || 'Pengeluaran bulk ke tim teknisi',
        stockBefore,
        stockAfter: item.currentStock,
        performedBy: this.currentUser.name,
        status: 'COMPLETED'
      };

      this.transactions.unshift(trx);
      transactions.push(trx);

      this.logAudit(
        'STOCK_OUT',
        'TRANSACTION',
        trx.id,
        `Pengeluaran ${item.name} (${qty} ${item.unit}) ke ${techNames}`
      );

      if (item.currentStock <= item.minimumStock) {
        const isOutOfStock = item.currentStock <= 0;
        notifications.push({
          title: isOutOfStock ? `�� STOK HABIS: ${item.name}` : `⚠️ STOK MENIPIS: ${item.name}`,
          body: `Stok tersisa ${item.currentStock} ${item.unit} (Batas Minimum: ${item.minimumStock} ${item.unit}).`,
          type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK'
        });
      }
    }

    for (const notif of notifications) {
      this.addNotification(notif.title, notif.body, notif.type, 'low-stock');
    }

    this.recalculateBatchCounters();
    this.persistAll();
    return transactions;
  }


  // --- MODEM STATUS UPDATES ---
  public createModemSN(data: Omit<ModemSerialNumber, 'id' | 'history'>): ModemSerialNumber {
    if (this.modemSNs.some(s => s.serialNumber.toUpperCase() === data.serialNumber.toUpperCase())) {
      throw new Error(`Serial Number ${data.serialNumber} sudah terdaftar!`);
    }

    let targetItemId = data.itemId;
    let targetItemName = data.itemName;

    if (data.status === 'RUSAK') {
      let rusakItem = this.items.find(i => 
        i.name.trim().toUpperCase() === 'ONT RUSAK' ||
        i.name.toUpperCase().includes('ONT RUSAK') ||
        (i.name.toUpperCase().includes('RUSAK') && (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE'))
      );
      if (!rusakItem) {
        const modemCat = this.categories.find(c => c.type === 'MODEM') || this.categories[0];
        rusakItem = {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: 'ONT RUSAK',
          categoryId: modemCat?.id || 'cat-modem',
          categoryType: 'MODEM',
          brand: 'Generic',
          model: 'ONT Rusak / Karantina',
          unit: 'unit',
          currentStock: 0,
          minimumStock: 0,
          location: 'Karantina Barang Rusak Gudang',
          defaultPrice: 0,
          description: 'Penampungan unit ONT/Modem rusak atau karantina yang siap RMA atau perbaikan',
          isSerialTracked: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.items.push(rusakItem);
      }
      targetItemId = rusakItem.id;
      targetItemName = rusakItem.name;
      rusakItem.currentStock = (rusakItem.currentStock || 0) + 1;
      rusakItem.updatedAt = new Date().toISOString();
    }

    const newSN: ModemSerialNumber = {
      ...data,
      itemId: targetItemId,
      itemName: targetItemName,
      id: `sn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      location: data.status === 'RUSAK' ? 'Karantina Barang Rusak Gudang' : (data.location || 'Gudang Utama'),
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          toStatus: data.status,
          action: data.status === 'RUSAK' ? 'Pendaftaran Masuk ONT Rusak / Karantina' : 'Pendaftaran Master Data SN Baru',
          notes: data.status === 'RUSAK' ? 'Didaftarkan langsung ke Stok Barang ONT Rusak' : 'Didaftarkan secara manual (Master Data)',
          performedBy: this.currentUser.name
        }
      ]
    };
    this.modemSNs.push(newSN);
    this.recalculateBatchCounters();
    this.persistAll();
    return newSN;
  }

  public updateModemSNDetails(id: string, data: Partial<ModemSerialNumber>): ModemSerialNumber {
    const idx = this.modemSNs.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Modem tidak ditemukan!');
    
    // Check if new serialNumber conflicts
    if (data.serialNumber && data.serialNumber.toUpperCase() !== this.modemSNs[idx].serialNumber.toUpperCase()) {
      if (this.modemSNs.some(s => s.serialNumber.toUpperCase() === data.serialNumber!.toUpperCase())) {
        throw new Error(`Serial Number ${data.serialNumber} sudah dipakai oleh modem lain!`);
      }
    }

    const currentModem = this.modemSNs[idx];
    if (data.status && data.status !== currentModem.status) {
      // Delegate status transition through full logic including SKU move & stock adjustment
      return this.updateModemSNStatus({
        serialNumber: currentModem.serialNumber,
        newStatus: data.status,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        opticalPower: data.opticalPower,
        odpPort: data.odpPort,
        notes: data.notes || `Update status melalui edit master data ke ${data.status}`,
        technicianId: data.assignedTechId,
        installationType: data.installationType,
        keterangan: data.keterangan
      });
    }

    this.modemSNs[idx] = { ...this.modemSNs[idx], ...data };
    this.persistAll();
    return this.modemSNs[idx];
  }

  public deleteModemSN(id: string): void {
    this.deletedIds.push(id);
    const idx = this.modemSNs.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.modemSNs.splice(idx, 1);
      this.persistAll();
    }
  }

  public updateModemSNStatus(params: {
    serialNumber: string;
    newStatus: ModemStatus;
    customerName?: string;
    customerAddress?: string;
    opticalPower?: string;
    odpPort?: string;
    notes?: string;
    technicianId?: string;
    installationType?: string;
    keterangan?: string;
  }): ModemSerialNumber {
    const modem = this.modemSNs.find(s => s.serialNumber.toUpperCase() === params.serialNumber.toUpperCase());
    if (!modem) throw new Error(`Modem dengan Serial Number ${params.serialNumber} tidak ditemukan!`);

    const oldStatus = modem.status;
    modem.status = params.newStatus;
    if (params.customerName) modem.customerName = params.customerName;
    if (params.customerAddress) modem.customerAddress = params.customerAddress;
    if (params.opticalPower) modem.opticalPower = params.opticalPower;
    if (params.odpPort) modem.odpPort = params.odpPort;
    if (params.notes) modem.notes = params.notes;

    if (params.installationType) {
      modem.installationType = params.installationType;
      modem.keterangan = params.installationType;
    } else if (params.keterangan) {
      modem.installationType = params.keterangan;
      modem.keterangan = params.keterangan;
    }

    if (params.newStatus === 'TERPASANG') {
      modem.installedDate = new Date().toISOString().slice(0, 10);
      modem.location = `Terpasang di Klien: ${params.customerName || modem.customerName || 'Pelanggan FTTH'}`;
      if (!modem.installationType && !modem.keterangan) {
        modem.installationType = 'PSB';
        modem.keterangan = 'PSB';
      }
    } else if (params.newStatus === 'RUSAK') {
      modem.location = 'Karantina Barang Rusak Gudang';
      modem.assignedTechId = undefined;
      modem.assignedTechName = undefined;
      modem.assignedTeamId = undefined;
      modem.assignedTeamName = undefined;
    } else if (params.newStatus === 'DIPINJAM_TEKNISI') {
      if (params.technicianId) {
        const tech = this.technicians.find(t => t.id === params.technicianId);
        const team = !tech ? this.teams.find(t => t.id === params.technicianId) : undefined;
        if (tech) {
          modem.assignedTechId = tech.id;
          modem.assignedTechName = tech.name;
          if (tech.teamId) {
            const t = this.teams.find(tm => tm.id === tech.teamId);
            if (t) {
              modem.teamId = t.id;
              modem.teamName = t.name;
              modem.assignedTeamId = t.id;
              modem.assignedTeamName = t.name;
            }
          }
        } else if (team) {
          modem.teamId = team.id;
          modem.teamName = team.name;
          modem.assignedTeamId = team.id;
          modem.assignedTeamName = team.name;
          modem.assignedTechId = team.id;
          modem.assignedTechName = team.name;
        }
        modem.location = `Dipinjam: ${tech?.name || team?.name || params.technicianId}`;
      } else {
        modem.location = 'Dipinjam Teknisi';
      }
    } else if (params.newStatus === 'AVAILABLE') {
      modem.assignedTechId = undefined;
      modem.assignedTechName = undefined;
      modem.location = 'Gudang Utama';
    } else if (params.newStatus === 'PERGANTIAN_MODEM' || params.newStatus === 'DISMANTLE') {
      if (params.technicianId) {
        const tech = this.technicians.find(t => t.id === params.technicianId);
        if (tech) {
          modem.assignedTechId = tech.id;
          modem.assignedTechName = tech.name;
        }
      } else {
        modem.assignedTechId = undefined;
        modem.assignedTechName = undefined;
      }
      modem.location = params.newStatus === 'PERGANTIAN_MODEM' ? 'Gudang (Pergantian Modem)' : 'Gudang (Dismantle)';
    }

    // Identify if the modem needs to be moved to a different Master Item SKU
    let newItemId = modem.itemId;
    let newItemName = modem.itemName;

    if (params.newStatus === 'DISMANTLE') {
      const dismantleItem = this.items.find(i => i.code === 'SKU-2457' || i.categoryType === 'DISMANTLE' || i.name.toUpperCase().includes('DISMANTLE') || i.name.toUpperCase().includes('PENARIKAN'));
      if (dismantleItem) {
        newItemId = dismantleItem.id;
        newItemName = dismantleItem.name;
      }
    } else if (params.newStatus === 'PERGANTIAN_MODEM') {
      const pergantianItem = this.items.find(i => i.name.toUpperCase().includes('PERGANTIAN'));
      if (pergantianItem) {
        newItemId = pergantianItem.id;
        newItemName = pergantianItem.name;
      }
    } else if (params.newStatus === 'RUSAK') {
      let rusakItem = this.items.find(i => 
        i.name.trim().toUpperCase() === 'ONT RUSAK' ||
        i.name.toUpperCase().includes('ONT RUSAK') ||
        (i.name.toUpperCase().includes('RUSAK') && (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE'))
      );
      if (!rusakItem) {
        const modemCat = this.categories.find(c => c.type === 'MODEM') || this.categories[0];
        rusakItem = {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: 'ONT RUSAK',
          categoryId: modemCat?.id || 'cat-modem',
          categoryType: 'MODEM',
          brand: 'Generic',
          model: 'ONT Rusak / Karantina',
          unit: 'unit',
          currentStock: 0,
          minimumStock: 0,
          location: 'Karantina Barang Rusak Gudang',
          defaultPrice: 0,
          description: 'Penampungan unit ONT/Modem rusak atau karantina yang siap RMA atau perbaikan',
          isSerialTracked: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.items.push(rusakItem);
      }
      newItemId = rusakItem.id;
      newItemName = rusakItem.name;
    }

    const oldItemId = modem.itemId;

    // Helper: Determine if a specific modem status represents active in-warehouse stock for a given item SKU
    const isStatusInWarehouseForItem = (itemId: string, status: ModemStatus): boolean => {
      const it = this.getItemById(itemId);
      const itName = (it?.name || '').toUpperCase();
      const isRusakItem = itName.includes('RUSAK');
      const isDismantleItem = itName.includes('DISMANTLE') || it?.categoryType === 'DISMANTLE';
      const isPergantianItem = itName.includes('PERGANTIAN');

      if (isRusakItem) {
        return status === 'RUSAK' || status === 'AVAILABLE';
      }
      if (isDismantleItem) {
        return status === 'DISMANTLE' || status === 'AVAILABLE' || status === 'RESERVED';
      }
      if (isPergantianItem) {
        return status === 'PERGANTIAN_MODEM' || status === 'AVAILABLE' || status === 'RESERVED';
      }
      return status === 'AVAILABLE' || status === 'RESERVED';
    };

    const wasInWarehouse = isStatusInWarehouseForItem(oldItemId, oldStatus);
    const isNowInWarehouse = isStatusInWarehouseForItem(newItemId, params.newStatus);

    if (oldItemId !== newItemId) {
      // Item changed (moved to a different SKU, e.g., to ONT RUSAK or DISMANTLE)
      const oldItem = this.getItemById(oldItemId);
      const newItem = this.getItemById(newItemId);
      
      if (oldItem && wasInWarehouse) {
        oldItem.currentStock = Math.max(0, (oldItem.currentStock || 0) - 1);
        oldItem.updatedAt = new Date().toISOString();

        // Transaction log for leaving old item stock
        const trxOut: StockTransaction = {
          id: `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          transactionNumber: `TRX-ADJ-${Date.now().toString().slice(-6)}`,
          type: 'ADJUSTMENT',
          date: new Date().toISOString().slice(0, 10),
          itemId: oldItemId,
          itemName: oldItem.name,
          categoryType: oldItem.categoryType,
          quantity: 1,
          unit: oldItem.unit,
          status: 'COMPLETED',
          serialNumbers: [modem.serialNumber],
          stockBefore: (oldItem.currentStock || 0) + 1,
          stockAfter: oldItem.currentStock || 0,
          notes: `Unit dialihkan ke ${newItemName} (Status: ${params.newStatus}). SN: ${modem.serialNumber}`,
          performedBy: this.currentUser.name
        };
        this.transactions.unshift(trxOut);
      }

      if (newItem && isNowInWarehouse) {
        newItem.currentStock = (newItem.currentStock || 0) + 1;
        newItem.updatedAt = new Date().toISOString();

        // Transaction log for entering new item stock (e.g. ONT RUSAK)
        const trxIn: StockTransaction = {
          id: `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          transactionNumber: `TRX-${params.newStatus === 'RUSAK' ? 'RSK' : 'IN'}-${Date.now().toString().slice(-6)}`,
          type: params.newStatus === 'RUSAK' ? 'STOCK_IN' : 'ADJUSTMENT',
          date: new Date().toISOString().slice(0, 10),
          itemId: newItemId,
          itemName: newItemName,
          categoryType: newItem.categoryType,
          quantity: 1,
          unit: newItem.unit,
          status: 'COMPLETED',
          serialNumbers: [modem.serialNumber],
          stockBefore: Math.max(0, (newItem.currentStock || 1) - 1),
          stockAfter: newItem.currentStock || 1,
          notes: params.newStatus === 'RUSAK'
            ? `Unit ONT Rusak / Karantina masuk ke stok barang ${newItemName}. SN: ${modem.serialNumber}${params.notes ? ` (${params.notes})` : ''}`
            : `Unit masuk ke stok ${newItemName} dari ${modem.itemName}. SN: ${modem.serialNumber}`,
          performedBy: this.currentUser.name
        };
        this.transactions.unshift(trxIn);
      }
      
      modem.itemId = newItemId;
      modem.itemName = newItemName;
    } else {
      // Update parent item stock if moving in/out of warehouse availability within the same SKU
      const item = this.getItemById(oldItemId);
      if (item) {
        if (!wasInWarehouse && isNowInWarehouse) {
          item.currentStock = (item.currentStock || 0) + 1;
          item.updatedAt = new Date().toISOString();

          if (params.newStatus === 'RUSAK') {
            const trxIn: StockTransaction = {
              id: `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              transactionNumber: `TRX-RSK-${Date.now().toString().slice(-6)}`,
              type: 'STOCK_IN',
              date: new Date().toISOString().slice(0, 10),
              itemId: item.id,
              itemName: item.name,
              categoryType: item.categoryType,
              quantity: 1,
              unit: item.unit,
              status: 'COMPLETED',
              serialNumbers: [modem.serialNumber],
              stockBefore: Math.max(0, (item.currentStock || 1) - 1),
              stockAfter: item.currentStock || 1,
              notes: `Unit masuk ke stok ${item.name} (Status: RUSAK / Karantina). SN: ${modem.serialNumber}`,
              performedBy: this.currentUser.name
            };
            this.transactions.unshift(trxIn);
          }
        } else if (wasInWarehouse && !isNowInWarehouse) {
          item.currentStock = Math.max(0, (item.currentStock || 0) - 1);
          item.updatedAt = new Date().toISOString();
        }
      }
    }

    const actionText = params.newStatus === 'RUSAK'
      ? 'Ubah Status ke RUSAK / KARANTINA (Masuk Stok ONT Rusak)'
      : `Perubahan Status ke ${params.newStatus}`;

    modem.history.unshift({
      id: `snlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action: actionText,
      fromStatus: oldStatus,
      toStatus: params.newStatus,
      techName: modem.assignedTechName,
      projectName: modem.projectName,
      notes: params.notes || (params.newStatus === 'RUSAK'
        ? `Status diubah ke RUSAK / KARANTINA. Unit otomatis dialihkan ke stok barang ONT RUSAK.`
        : `Status diubah dari ${oldStatus} menjadi ${params.newStatus}`),
      performedBy: this.currentUser.name
    });

    this.logAudit(
      'MODEM_STATUS_CHANGE',
      'MODEM_SN',
      modem.id,
      `Ubah status SN ${modem.serialNumber}: ${oldStatus} → ${params.newStatus}${params.newStatus === 'RUSAK' ? ' (Masuk ke Stok Barang ONT Rusak)' : ''}`
    );
    this.recalculateBatchCounters();
    this.persistAll();
    return modem;
  }

  // --- REQUISITION APPROVAL FLOW ---
  public createRequisition(params: {
    techId: string;
    project: string;
    purpose?: string;
    notes?: string;
    items: { itemId: string; quantity: number }[];
  }): RequisitionApproval {
    const tech = this.technicians.find(t => t.id === params.techId);
    if (!tech) throw new Error("Data Teknisi tidak valid");

    const mappedItems = params.items.map(reqItem => {
      const it = this.getItemById(reqItem.itemId);
      if (!it) throw new Error(`Barang ${reqItem.itemId} tidak ditemukan`);
      return {
        itemId: it.id,
        itemName: it.name,
        categoryType: it.categoryType,
        quantity: reqItem.quantity,
        unit: it.unit
      };
    });

    const reqNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    const effectivePurpose = params.purpose || params.notes || 'Kebutuhan pekerjaan lapangan';
    const newReq: RequisitionApproval = {
      id: `req-${Date.now()}`,
      reqNumber,
      requisitionNumber: reqNumber,
      date: new Date().toISOString().slice(0, 10),
      techId: tech.id,
      techName: tech.name,
      
      
      project: params.project,
      purpose: effectivePurpose,
      notes: params.notes || effectivePurpose,
      items: mappedItems,
      status: 'PENDING'
    };

    this.requisitions.unshift(newReq);
    this.logAudit('REQUISITION_CREATE', 'REQUISITION', newReq.id, `Pengajuan barang dibuat: ${reqNumber} oleh ${tech.name}`);
    this.addNotification(
      `�� Pengajuan Barang Baru: ${reqNumber}`,
      `${tech.name} mengajukan ${mappedItems.length} item untuk proyek: ${params.project}`,
      'APPROVAL_PENDING',
      'approvals'
    );

    this.persistAll();
    return newReq;
  }

  public updateRequisitionStatus(
    reqId: string,
    status: 'APPROVED' | 'REJECTED',
    supervisorNotes?: string
  ): RequisitionApproval {
    const req = this.requisitions.find(r => r.id === reqId);
    if (!req) throw new Error('Pengajuan tidak ditemukan');

    req.status = status;
    req.supervisorNotes = supervisorNotes || (status === 'APPROVED' ? 'Disetujui oleh Supervisor' : 'Ditolak');
    req.approvedBy = this.currentUser.name;
    req.approvedAt = new Date().toISOString();

    this.logAudit(
      status === 'APPROVED' ? 'REQUISITION_APPROVED' : 'REQUISITION_REJECTED',
      'REQUISITION',
      req.id,
      `Pengajuan ${req.reqNumber} di-${status} oleh ${this.currentUser.name}`
    );

    this.addNotification(
      `Pengajuan ${req.reqNumber} ${status === 'APPROVED' ? 'Disetujui ✅' : 'Ditolak ❌'}`,
      `Catatan Supervisor: ${req.supervisorNotes}`,
      'APPROVAL_PENDING',
      'approvals'
    );

    this.persistAll();
    return req;
  }

  public completeRequisitionDispatch(reqId: string, itemSNsMap?: Record<string, string[]>): void {
    const req = this.requisitions.find(r => r.id === reqId);
    if (!req) throw new Error('Pengajuan tidak ditemukan');
    if (req.status !== 'APPROVED') throw new Error('Hanya pengajuan dengan status APPROVED yang dapat dikeluarkan');

    // Process stock out for each item
    for (const reqItem of req.items) {
      const selectedSNs = itemSNsMap ? itemSNsMap[reqItem.itemId] : undefined;
      this.processStockOut({
        itemId: reqItem.itemId,
        techId: req.techId,
        project: req.project,
        purpose: req.purpose,
        quantity: reqItem.quantity,
        date: new Date().toISOString().slice(0, 10),
        notes: `Pengeluaran via Pengajuan Resmi ${req.reqNumber}`,
        selectedSerialNumbers: selectedSNs,
        approvalId: req.id
      });
    }

    req.status = 'COMPLETED';
    req.completedBy = this.currentUser.name;
    req.completedAt = new Date().toISOString();

    this.logAudit('REQUISITION_COMPLETED', 'REQUISITION', req.id, `Barang pengajuan ${req.reqNumber} telah dikeluarkan dari gudang.`);
    this.persistAll();
  }

  // --- STOCK OPNAME ---
  public createStockOpname(params: {
    categoryFilter?: string;
    notes: string;
    details?: {
      itemId: string;
      physicalStock: number;
      notes: string;
      serialNumbersChecked?: string[];
      missingSerialNumbers?: string[];
    }[];
    items?: {
      itemId: string;
      itemCode?: string;
      itemName?: string;
      physicalStock: number;
      notes?: string;
      serialNumbersChecked?: string[];
      missingSerialNumbers?: string[];
    }[];
    autoAdjustStock?: boolean;
    autoAdjust?: boolean;
  }): StockOpname {
    const opnameNumber = `OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    const shouldAutoAdjust = params.autoAdjustStock ?? params.autoAdjust ?? false;
    const rawList = params.details || params.items || [];
    
    let totalDifference = 0;
    const computedDetails = rawList.map(d => {
      const item = this.getItemById(d.itemId);
      if (!item) throw new Error(`Barang ${d.itemId} tidak valid!`);
      const diff = Number((d.physicalStock - item.currentStock).toFixed(2));
      totalDifference += diff;

      // If auto adjustment is enabled
      if (shouldAutoAdjust && diff !== 0) {
        const stockBefore = item.currentStock;
        item.currentStock = d.physicalStock;
        item.updatedAt = new Date().toISOString();

        const trx: StockTransaction = {
          id: `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          transactionNumber: `TRX-ADJ-${Date.now()}`,
          type: 'ADJUSTMENT',
          date: new Date().toISOString().slice(0, 10),
          itemId: item.id,
          itemName: item.name,
          categoryType: item.categoryType,
          quantity: Math.abs(diff),
          unit: item.unit,
          notes: `Penyesuaian hasil Stock Opname ${opnameNumber}. Alasan: ${d.notes || 'Selisih fisik vs sistem'}`,
          stockBefore,
          stockAfter: item.currentStock,
          performedBy: this.currentUser.name,
          status: 'COMPLETED'
        };
        this.transactions.unshift(trx);
      }

      return {
        id: `opnd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        categoryType: item.categoryType,
        unit: item.unit,
        systemStock: item.currentStock,
        physicalStock: d.physicalStock,
        difference: diff,
        notes: d.notes || '',
        serialNumbersChecked: d.serialNumbersChecked,
        missingSerialNumbers: d.missingSerialNumbers
      };
    });

    const opname: StockOpname = {
      id: `opn-${Date.now()}`,
      opnameNumber,
      date: new Date().toISOString().slice(0, 10),
      status: 'COMPLETED',
      categoryFilter: params.categoryFilter,
      performedBy: this.currentUser.name,
      verifiedBy: this.currentUser.role === 'ADMIN' || this.currentUser.role === 'SUPERADMIN' ? this.currentUser.name : undefined,
      notes: params.notes,
      itemsCheckedCount: computedDetails.length,
      totalDifference,
      details: computedDetails,
      items: computedDetails,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    this.opnames.unshift(opname);
    this.logAudit('STOCK_OPNAME_COMPLETED', 'STOCK_OPNAME', opname.id, `Stock Opname selesai: ${opnameNumber} (${computedDetails.length} barang diperiksa, selisih: ${totalDifference})`);
    
    this.addNotification(
      `✅ Stock Opname Selesai: ${opnameNumber}`,
      `Total ${computedDetails.length} item telah diopname. Total selisih: ${totalDifference}`,
      'OPNAME_DONE',
      'stock-opname'
    );

    this.persistAll();
    return opname;
  }

  // --- CRUD FOR TEAMS, TECHS, CATEGORIES, UNITS, SUPPLIERS, PROJECTS ---



  
  

  

  

    public addTeam(team: Team): void {
    if (this.teams.some(t => t.id === team.id)) throw new Error('Team ID sudah ada!');
    this.teams.unshift(team);
    this.persistAll();
  }

  public updateTeam(id: string, updates: Partial<Team>): void {
    const idx = this.teams.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.teams[idx] = { ...this.teams[idx], ...updates };
      this.persistAll();
    }
  }

  public deleteTeam(id: string): void {
    this.deletedIds.push(id);
    this.teams = this.teams.filter(t => t.id !== id);
    this.persistAll();
  }

  public addTechnician(data: Omit<Technician, 'id'>): Technician {
    const newTech: Technician = {
      ...data,
      id: `tech-${Date.now()}`
    };
    this.technicians.push(newTech);
    this.logAudit('TECH_CREATE', 'TECHNICIAN', newTech.id, `Tambah teknisi: ${newTech.name} (${newTech.nik})`);
    this.persistAll();
    return newTech;
  }

  public updateTechnician(id: string, data: Partial<Technician>): Technician {
    const idx = this.technicians.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Teknisi tidak ditemukan');
    this.technicians[idx] = { ...this.technicians[idx], ...data };
    this.logAudit('TECH_UPDATE', 'TECHNICIAN', id, `Ubah teknisi: ${this.technicians[idx].name}`);
    this.persistAll();
    return this.technicians[idx];
  }

  public deleteTechnician(id: string): void {
    this.deletedIds.push(id);
    const idx = this.technicians.findIndex(t => t.id === id);
    if (idx !== -1) {
      const tech = this.technicians[idx];
      this.technicians.splice(idx, 1);
      this.logAudit('TECH_DELETE', 'TECHNICIAN', id, `Hapus teknisi: ${tech.name}`);
      this.persistAll();
    }
  }

  public addUnit(data: Omit<Unit, 'id'>): Unit {
    const unit: Unit = { ...data, id: `u-${Date.now()}` };
    this.units.push(unit);
    this.persistAll();
    return unit;
  }

  public updateUnit(id: string, data: Partial<Unit>): Unit {
    const idx = this.units.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Unit tidak ditemukan');
    this.units[idx] = { ...this.units[idx], ...data };
    this.persistAll();
    return this.units[idx];
  }

  public deleteUnit(id: string): void {
    this.deletedIds.push(id);
    this.units = this.units.filter(u => u.id !== id);
    this.persistAll();
  }

  public addCategory(data: Omit<Category, 'id'>): Category {
    const cat: Category = { ...data, id: `cat-${Date.now()}` };
    this.categories.push(cat);
    this.persistAll();
    return cat;
  }

  public updateCategory(id: string, data: Partial<Category>): Category {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Kategori tidak ditemukan');
    this.categories[idx] = { ...this.categories[idx], ...data };
    this.persistAll();
    return this.categories[idx];
  }

  public deleteCategory(id: string): void {
    this.deletedIds.push(id);
    this.categories = this.categories.filter(c => c.id !== id);
    this.persistAll();
  }

  public addSupplier(data: Omit<Supplier, 'id'>): Supplier {
    const sup: Supplier = { ...data, id: `sup-${Date.now()}` };
    this.suppliers.push(sup);
    this.persistAll();
    return sup;
  }

  public updateSupplier(id: string, data: Partial<Supplier>): Supplier {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Supplier tidak ditemukan');
    this.suppliers[idx] = { ...this.suppliers[idx], ...data };
    this.persistAll();
    return this.suppliers[idx];
  }

  public deleteSupplier(id: string): void {
    this.deletedIds.push(id);
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    this.persistAll();
  }

  public addProject(data: Omit<Project, 'id'>): Project {
    const prj: Project = { ...data, id: `prj-${Date.now()}` };
    this.projects.push(prj);
    this.persistAll();
    return prj;
  }

  public updateProject(id: string, data: Partial<Project>): Project {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project tidak ditemukan');
    this.projects[idx] = { ...this.projects[idx], ...data };
    this.persistAll();
    return this.projects[idx];
  }



  public deleteProject(id: string): void {
    this.deletedIds.push(id);
    this.projects = this.projects.filter(p => p.id !== id);
    this.persistAll();
  }

  public addUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      ...data,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    this.logAudit('USER_CREATE', 'USER', user.id, `Tambah user: ${user.name} (${user.role})`);
    this.persistAll();
    return user;
  }

  public get stockOpnames(): StockOpname[] {
    return this.opnames;
  }


  public createTechnician(data: Omit<Technician, 'id'>): Technician {
    return this.addTechnician(data);
  }

  public createSupplier(data: Omit<Supplier, 'id'>): Supplier {
    return this.addSupplier(data);
  }

  public createProject(data: Omit<Project, 'id'>): Project {
    return this.addProject(data);
  }

  public createUnit(data: Omit<Unit, 'id'>): Unit {
    return this.addUnit(data);
  }

  public createCategory(data: Omit<Category, 'id'>): Category {
    return this.addCategory(data);
  }

  public createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    return this.addUser(data);
  }

  public approveRequisition(reqId: string, notes?: string): RequisitionApproval {
    return this.updateRequisitionStatus(reqId, 'APPROVED', notes);
  }

  public rejectRequisition(reqId: string, notes?: string): RequisitionApproval {
    return this.updateRequisitionStatus(reqId, 'REJECTED', notes);
  }

  public dispatchRequisition(reqId: string, itemSNsMap?: Record<string, string[]>): void {
    this.completeRequisitionDispatch(reqId, itemSNsMap);
  }

  public performStockAdjustment(params: {
    itemId: string;
    newStock: number;
    reason: string;
  }): StockTransaction {
    const item = this.getItemById(params.itemId);
    if (!item) throw new Error('Barang tidak ditemukan');

    const stockBefore = item.currentStock;
    const diff = params.newStock - stockBefore;
    item.currentStock = params.newStock;
    item.updatedAt = new Date().toISOString();

    const trx: StockTransaction = {
      id: `trx-${Date.now()}`,
      transactionNumber: `TRX-ADJ-${Date.now()}`,
      type: 'ADJUSTMENT',
      date: new Date().toISOString().slice(0, 10),
      itemId: item.id,
      itemName: item.name,
      categoryType: item.categoryType,
      quantity: Math.abs(diff),
      unit: item.unit,
      notes: `Penyesuaian manual: ${params.reason}. (Perubahan: ${diff > 0 ? '+' : ''}${diff})`,
      stockBefore,
      stockAfter: item.currentStock,
      performedBy: this.currentUser.name,
      status: 'COMPLETED'
    };

    this.transactions.unshift(trx);
    this.logAudit('STOCK_ADJUSTMENT', 'ITEM', item.id, `Penyesuaian stok ${item.name}: ${stockBefore} → ${item.currentStock}. Alasan: ${params.reason}`);
    this.persistAll();
    return trx;
  }

  // --- REPORTING GENERATORS ---
  public getMonthlySummary(month: number, year: number) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    
    return this.items.map(item => {
      // Find transactions in this month
      const monthTrxs = this.transactions.filter(t => t.itemId === item.id && t.date.startsWith(prefix));
      
      const masuk = monthTrxs.filter(t => t.type === 'STOCK_IN').reduce((acc, curr) => acc + curr.quantity, 0);
      const keluar = monthTrxs.filter(t => t.type === 'STOCK_OUT').reduce((acc, curr) => acc + curr.quantity, 0);
      const adj = monthTrxs.filter(t => t.type === 'ADJUSTMENT').reduce((acc, curr) => acc + curr.quantity, 0);

      // Approximate initial stock
      const current = item.currentStock;
      const stokAwal = Math.max(0, current - masuk + keluar - adj);

      return {
        item,
        code: item.code,
        name: item.name,
        categoryType: item.categoryType,
        unit: item.unit,
        stokAwal: Number(stokAwal.toFixed(2)),
        masuk: Number(masuk.toFixed(2)),
        keluar: Number(keluar.toFixed(2)),
        adjustment: Number(adj.toFixed(2)),
        stokAkhir: Number(current.toFixed(2))
      };
    });
  }


  // --- BACKUP & RESTORE ---
  public exportDatabaseJSON(): string {
    const dump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.settings,
      users: this.users,
      technicians: this.technicians,
      categories: this.categories,
      units: this.units,
      suppliers: this.suppliers,
      projects: this.projects,
      items: this.items,
      batches: this.batches,
      modemSNs: this.modemSNs,
      cableUsages: this.cableUsages,
      transactions: this.transactions,
      requisitions: this.requisitions,
      opnames: this.opnames,
      notifications: this.notifications,
      auditLogs: this.auditLogs
    };
    return JSON.stringify(dump, null, 2);
  }

  public async clearTransactionsAndStock(): Promise<void> {
    this.transactions = [];
    this.cableUsages = [];
    this.requisitions = [];
    this.opnames = [];
    this.batches = [];
    this.modemSNs = [];
    this.notifications = [];
    this.items = this.items.map(item => ({ ...item, currentStock: 0 }));
    
    this.logAudit('DATABASE_RESET', 'DATABASE', 'all', 'Menghapus seluruh data transaksi, riwayat kabel, pengajuan, batch, dan stok barang (reset ke 0).');
    
    try {
      if (typeof window === 'undefined') return;
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {
      console.error('Failed to reset backend', e);
    }
  }

  public importDatabaseJSON(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      if (!data.items || !data.transactions) {
        throw new Error('Format file backup tidak valid!');
      }
      if (data.settings) this.settings = data.settings;
      if (data.users) this.users = data.users;
      if (data.technicians) this.technicians = data.technicians;
      if (data.categories) this.categories = data.categories;
      if (data.units) this.units = data.units;
      if (data.suppliers) this.suppliers = data.suppliers;
      if (data.projects) this.projects = data.projects;
      if (data.items) this.items = data.items;
      if (data.batches) this.batches = data.batches;
      if (data.modemSNs) this.modemSNs = data.modemSNs;
      if (data.cableUsages) this.cableUsages = data.cableUsages;
      if (data.transactions) this.transactions = data.transactions;
      if (data.requisitions) this.requisitions = data.requisitions;
      if (data.opnames) this.opnames = data.opnames;
      if (data.notifications) this.notifications = data.notifications;
      if (data.auditLogs) this.auditLogs = data.auditLogs;

      this.recalculateBatchCounters();
      this.persistAll();
      this.logAudit('DATABASE_RESTORE', 'DATABASE', 'all', 'Melakukan restore backup database JSON.');
    } catch (err: any) {
      throw new Error(`Gagal memuat backup: ${err.message}`);
    }
  }
  public deleteTransaction(id: string): void {
    this.deletedIds.push(id);
    if (this.currentUser?.role !== 'SUPERADMIN') {
      throw new Error('Hanya Superadmin yang dapat menghapus transaksi.');
    }
    const trxIndex = this.transactions.findIndex(t => t.id === id);
    if (trxIndex === -1) return;
    
    const trx = this.transactions[trxIndex];
    const item = this.items.find(i => i.id === trx.itemId);
    
    if (item) {
      if (trx.type === 'STOCK_IN' || trx.type === 'RETURN') {
        item.currentStock -= trx.quantity;
      } else if (trx.type === 'STOCK_OUT') {
        item.currentStock += trx.quantity;
      } else if (trx.type === 'ADJUSTMENT') {
        item.currentStock += (trx.stockBefore - trx.stockAfter);
      }
      item.updatedAt = new Date().toISOString();
    }
    
    this.transactions.splice(trxIndex, 1);
    
    this.logAudit(
      'TRANSACTION_DELETE',
      'TRANSACTION',
      trx.id,
      `Superadmin menghapus transaksi ${trx.transactionNumber} (${trx.type}) untuk ${trx.itemName} sejumlah ${trx.quantity}`
    );
    this.persistAll();
  }
  public updateTeamMaterialStatus(id: string, newStatus: 'SISA' | 'HABIS', notes?: string, customerName?: string): void {
    const mat = this.teamMaterials.find(m => m.id === id);
    if (!mat) return;
    const oldStatus = mat.status;
    mat.status = newStatus;
    if (newStatus === 'HABIS') {
      mat.dateDepleted = new Date().toISOString().slice(0, 10);
    } else {
      mat.dateDepleted = null;
    }
    
    const psbNote = customerName?.trim() ? `Note Psb An ${customerName.trim()}` : '';
    const fullNoteParts = [psbNote, notes?.trim()].filter(Boolean);
    const combinedNotes = fullNoteParts.join(' - ');

    if (combinedNotes) {
      mat.notes = mat.notes ? `${mat.notes} | ${combinedNotes}` : combinedNotes;
    }

    // Catat ke Audit Log
    this.logAudit(
      'TEAM_MATERIAL_STATUS',
      'MATERIAL',
      mat.id,
      `Status material tim ${mat.itemName} (${mat.techName}) diubah dari ${oldStatus} menjadi ${newStatus}${psbNote ? ` - ${psbNote}` : ''}${notes ? ` - Catatan: ${notes}` : ''}`
    );

    // Jika ditandai HABIS, catat juga ke log mutasi transaksi agar terekam di riwayat pemakaian tim
    if (newStatus === 'HABIS') {
      const item = this.items.find(i => i.id === mat.itemId);
      const trxDate = new Date().toISOString();
      const trxNumber = `TRX-USE-${trxDate.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const trx: StockTransaction = {
        id: `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        transactionNumber: trxNumber,
        type: 'STOCK_OUT',
        date: trxDate,
        itemId: mat.itemId,
        itemName: mat.itemName,
        categoryType: item?.categoryType || 'BARANG_TEKNISI',
        quantity: mat.quantity,
        unit: mat.unit,
        stockBefore: item?.currentStock || 0,
        stockAfter: item?.currentStock || 0,
        performedBy: this.currentUser?.name || 'Sistem',
        techId: mat.techId,
        techName: mat.techName,
        teamId: mat.teamId,
        teamName: mat.teamName,
        customerName: customerName?.trim() || undefined,
        purpose: psbNote || 'Pemakaian Material Tim (Habis)',
        notes: combinedNotes || `Material ${mat.itemName} ditandai habis oleh tim`,
        status: 'COMPLETED'
      };
      this.transactions.unshift(trx);
    }

    this.persistAll();
  }

  public returnTeamMaterial(matId: string, returnQty: number, notes?: string): void {
    if (returnQty <= 0) return;
    const mat = this.teamMaterials.find(m => m.id === matId);
    if (!mat) return;
    if (returnQty > mat.quantity) {
      throw new Error(`Jumlah pengembalian (${returnQty}) melebihi sisa material (${mat.quantity})`);
    }

    const item = this.items.find(i => i.id === mat.itemId);
    const prevQty = mat.quantity;
    mat.quantity -= returnQty;
    if (mat.quantity <= 0) {
      mat.status = 'HABIS';
      mat.dateDepleted = new Date().toISOString().slice(0, 10);
    }

    if (item) {
      const stockBefore = item.currentStock;
      item.currentStock += returnQty;
      item.updatedAt = new Date().toISOString();

      const trxNumber = 'RTN-' + Date.now();
      const trxDate = new Date().toISOString();
      const trxNotes = notes || 'Pengembalian sisa material tim ke gudang';

      this.transactions.unshift({
        id: 'trx-' + Date.now() + Math.floor(Math.random() * 1000),
        transactionNumber: trxNumber,
        type: 'RETURN',
        date: trxDate,
        itemId: item.id,
        itemName: item.name,
        categoryType: item.categoryType,
        quantity: returnQty,
        unit: item.unit,
        techId: mat.techId,
        techName: mat.techName,
        teamId: mat.teamId,
        teamName: mat.teamName,
        purpose: 'Pengembalian sisa material tim',
        notes: trxNotes,
        stockBefore: stockBefore,
        stockAfter: item.currentStock,
        performedBy: this.currentUser?.name || 'Sistem',
        status: 'COMPLETED'
      });
    }

    this.logAudit(
      'TEAM_MATERIAL_RETURN',
      'MATERIAL',
      mat.id,
      `Pengembalian sisa material tim ${mat.itemName} (${mat.techName}) sejumlah ${returnQty} ${mat.unit} ke gudang (Sisa: ${mat.quantity} ${mat.unit})${notes ? ` (${notes})` : ''}`
    );
    this.persistAll();
  }

  public deleteTeamMaterial(id: string): void {
    this.deletedIds.push(id);
    if (this.currentUser?.role !== 'SUPERADMIN') {
      throw new Error('Hanya Superadmin yang dapat menghapus tracking material tim.');
    }
    const matIndex = this.teamMaterials.findIndex(t => t.id === id);
    if (matIndex === -1) return;
    
    const mat = this.teamMaterials[matIndex];
    
    this.teamMaterials.splice(matIndex, 1);
    
    this.logAudit(
      'TEAM_MATERIAL_DELETE',
      'MATERIAL',
      mat.id,
      `Superadmin menghapus tracking material tim untuk ${mat.itemName} sejumlah ${mat.quantity} ${mat.unit}`
    );
    this.persistAll();
  }
}
