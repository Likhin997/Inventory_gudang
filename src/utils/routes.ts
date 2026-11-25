export interface RouteMeta {
  tabId: string;
  path: string;
  title: string;
}

export const APP_ROUTES: RouteMeta[] = [
  { tabId: 'dashboard', path: '/dashboard', title: 'Dashboard - Jet Cyber Network' },
  { tabId: 'inventory-all', path: '/inventory', title: 'Semua Barang & Stok - Jet Cyber Network' },
  { tabId: 'modems', path: '/modems/borrowed', title: 'Modem Dipinjam Teknisi - Jet Cyber Network' },
  { tabId: 'modems-terpasang', path: '/modems/installed', title: 'Modem Terpasang - Jet Cyber Network' },
  { tabId: 'modems-rusak', path: '/modems/damaged', title: 'ONT / Modem Rusak - Jet Cyber Network' },
  { tabId: 'modems-all', path: '/modems', title: 'Semua Modem / ONT - Jet Cyber Network' },
  { tabId: 'cables', path: '/cables', title: 'Kabel Fiber Optik - Jet Cyber Network' },
  { tabId: 'general', path: '/general', title: 'Barang Umum & Aksesoris - Jet Cyber Network' },
  { tabId: 'teamMaterials', path: '/team-materials', title: 'Tracking Material Tim - Jet Cyber Network' },
  { tabId: 'low-stock', path: '/low-stock', title: 'Low Stock Alert - Jet Cyber Network' },
  { tabId: 'stock-in', path: '/stock-in', title: 'Barang Masuk - Jet Cyber Network' },
  { tabId: 'stock-out', path: '/stock-out', title: 'Barang Keluar - Jet Cyber Network' },
  { tabId: 'requisitions', path: '/requisitions', title: 'Pengajuan Barang - Jet Cyber Network' },
  { tabId: 'approvals', path: '/approvals', title: 'Approval Transaksi - Jet Cyber Network' },
  { tabId: 'opname', path: '/opname', title: 'Stock Opname & Audit - Jet Cyber Network' },
  { tabId: 'reports', path: '/reports', title: 'Laporan Bulanan - Jet Cyber Network' },
  { tabId: 'reports-team', path: '/reports/team', title: 'Laporan Pemakaian Tim - Jet Cyber Network' },
  { tabId: 'reports-movement', path: '/reports/movement', title: 'Audit Trail & Log - Jet Cyber Network' },
  { tabId: 'technicians', path: '/technicians', title: 'Teknisi & Tim - Jet Cyber Network' },
  { tabId: 'master-suppliers', path: '/master/suppliers', title: 'Master Supplier - Jet Cyber Network' },
  { tabId: 'master-projects', path: '/master/projects', title: 'Master Project - Jet Cyber Network' },
  { tabId: 'master-categories', path: '/master/categories', title: 'Master Kategori - Jet Cyber Network' },
  { tabId: 'master-units', path: '/master/units', title: 'Master Satuan Unit - Jet Cyber Network' },
  { tabId: 'admin-users', path: '/admin/users', title: 'Pengguna & Role - Jet Cyber Network' },
  { tabId: 'ci4-export', path: '/ci4-export', title: 'CodeIgniter 4 Schema - Jet Cyber Network' },
];

const TAB_ALIASES: Record<string, string> = {
  'inventory-modem': 'modems',
  'inventory-kabel': 'cables',
  'inventory-umum': 'general',
  'team-materials': 'teamMaterials',
  'stock-opname': 'opname',
  'teams': 'technicians',
  'administration': 'admin-users',
};

export function normalizeTabId(tabId: string): string {
  return TAB_ALIASES[tabId] || tabId;
}

export function getPathFromTab(tabId: string): string {
  const normalized = normalizeTabId(tabId);
  const found = APP_ROUTES.find((r) => r.tabId === normalized);
  return found ? found.path : '/dashboard';
}

export function getTitleFromTab(tabId: string): string {
  const normalized = normalizeTabId(tabId);
  const found = APP_ROUTES.find((r) => r.tabId === normalized);
  return found ? found.title : 'Jet Cyber Network - ISP Inventory Management';
}

export function getTabFromPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/login') return 'dashboard';
  const found = APP_ROUTES.find((r) => r.path === clean);
  return found ? found.tabId : 'dashboard';
}
