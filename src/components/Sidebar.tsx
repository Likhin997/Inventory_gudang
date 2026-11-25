import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Radio,
  Cable,
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Factory,
  CheckSquare,
  Activity,
  Users,
  UserCheck,
  Calculator,
  FileSpreadsheet,
  History,
  Tags,
  Truck,
  Briefcase,
  Ruler,
  ShieldCheck,
  FileCode,
  X,
  Terminal
} from 'lucide-react';
import { InventoryService } from '../services/storageService';
import { logger } from '../utils/logger';
import { JetCyberLogo } from './JetCyberLogo';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isOpenMobile,
  onCloseMobile
}) => {
  const service = InventoryService.getInstance();
  const currentUser = service.currentUser;
  const lowStockCount = service.items.filter(i => i.currentStock <= i.minimumStock).length;
  const pendingApprovals = service.requisitions.filter(r => r.status === 'PENDING').length;
  const totalModems = service.items.filter(i => (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE')).length;
  const rusakModemsCount = service.modemSNs.filter(s => s.status === 'RUSAK').length;
  const [errorCount, setErrorCount] = React.useState(() => logger.getLogs().filter(l => l.level === 'error').length);

  React.useEffect(() => {
    return logger.subscribe(() => {
      setErrorCount(logger.getLogs().filter(l => l.level === 'error').length);
    });
  }, []);

  const isMobileOpen = isOpen || isOpenMobile;
  const handleClose = onClose || onCloseMobile;

  const getAllowedSections = () => {
    switch (currentUser.role) {
      case 'TEKNISI':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
          },
          {
            title: 'Transactions',
            items: [
              { id: 'requisitions', label: 'Pengajuan Barang', icon: ClipboardList }
            ]
          }
        ];
      case 'GUDANG':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
          },
          {
            title: 'Stock Barang',
            items: [
              { id: 'inventory-all', label: 'Stok Semua Barang', icon: Boxes, badge: service.items.length },
              { id: 'modems-terpasang', label: 'Barang Terpasang (Aktif)', icon: Activity },
              { id: 'modems', label: 'Barang Dipinjam Teknisi', icon: Users },
              {
                id: 'modems-rusak',
                label: 'Stok Barang ONT Rusak',
                icon: AlertTriangle,
                badge: rusakModemsCount > 0 ? rusakModemsCount : undefined,
                badgeColor: 'bg-red-500 text-white font-bold'
              }
            ]
          },
          {
            title: 'Kategori Lainnya',
            items: [
              { id: 'modems-all', label: 'Modem / ONT (Tracking SN)', icon: Radio, badge: totalModems },
              { id: 'cables', label: 'Cable Meterage', icon: Cable },
              { id: 'general', label: 'General Goods', icon: Package },
              { id: 'teamMaterials', label: 'Tracking Material Tim', icon: Factory },
              {
                id: 'low-stock',
                label: 'Low Stock Alert',
                icon: AlertTriangle,
                badge: lowStockCount > 0 ? lowStockCount : undefined,
                badgeColor: 'bg-red-500 text-white font-bold'
              }
            ]
          },
          {
            title: 'Transactions',
            items: [
              { id: 'stock-in', label: 'Barang Masuk', icon: ArrowDownToLine },
              { id: 'stock-out', label: 'Barang Keluar', icon: ArrowUpFromLine },
              { id: 'requisitions', label: 'Pengajuan Barang', icon: ClipboardList },
              {
                id: 'approvals',
                label: 'Approval Pengajuan Teknisi',
                icon: CheckSquare,
                badge: pendingApprovals > 0 ? pendingApprovals : undefined,
                badgeColor: 'bg-amber-500 text-slate-900 font-bold'
              }
            ]
          },
          {
            title: 'Stock Opname',
            items: [
              { id: 'opname', label: 'Stock Opname & Audit', icon: Calculator }
            ]
          }
        ];
      case 'ADMIN':
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
          },
          {
            title: 'Inventory (View Only)',
            items: [
              { id: 'inventory-all', label: 'Semua Barang', icon: Boxes, badge: service.items.length },
              { id: 'low-stock', label: 'Low Stock Alert', icon: AlertTriangle, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-red-500 text-white font-bold' }
            ]
          },
          {
            title: 'Transactions',
            items: [
              { id: 'stock-in', label: 'Request Tambah Barang', icon: ArrowDownToLine },
              {
                id: 'approvals',
                label: 'Approval Stock In',
                icon: CheckSquare,
                badge: pendingApprovals > 0 ? pendingApprovals : undefined,
                badgeColor: 'bg-amber-500 text-slate-900 font-bold'
              }
            ]
          },
          {
            title: 'Reports & Analytics',
            items: [
              { id: 'reports', label: 'Laporan Bulanan', icon: FileSpreadsheet },
            ]
          }
        ];
      case 'SUPERADMIN':
      default:
        return [
          {
            title: 'Main Menu',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
            ]
          },
          {
            title: 'Stock Barang',
            items: [
              { id: 'inventory-all', label: 'Stok Semua Barang', icon: Boxes, badge: service.items.length },
              { id: 'modems-terpasang', label: 'Barang Terpasang (Aktif)', icon: Activity },
              { id: 'modems', label: 'Barang Dipinjam Teknisi', icon: Users },
              {
                id: 'modems-rusak',
                label: 'Stok Barang ONT Rusak',
                icon: AlertTriangle,
                badge: rusakModemsCount > 0 ? rusakModemsCount : undefined,
                badgeColor: 'bg-red-500 text-white font-bold'
              }
            ]
          },
          {
            title: 'Kategori Lainnya',
            items: [
              { id: 'modems-all', label: 'Modem / ONT (Tracking SN)', icon: Radio, badge: totalModems },
              { id: 'cables', label: 'Cable Meterage', icon: Cable },
              { id: 'general', label: 'General Goods', icon: Package },
              { id: 'teamMaterials', label: 'Tracking Material Tim', icon: Factory },
              {
                id: 'low-stock',
                label: 'Low Stock Alert',
                icon: AlertTriangle,
                badge: lowStockCount > 0 ? lowStockCount : undefined,
                badgeColor: 'bg-red-500 text-white font-bold'
              }
            ]
          },
          {
            title: 'Transactions',
            items: [
              { id: 'stock-in', label: 'Barang Masuk', icon: ArrowDownToLine },
              { id: 'stock-out', label: 'Barang Keluar', icon: ArrowUpFromLine },
              { id: 'requisitions', label: 'Pengajuan Barang', icon: ClipboardList },
              {
                id: 'approvals',
                label: 'Approval Transaksi',
                icon: CheckSquare,
                badge: pendingApprovals > 0 ? pendingApprovals : undefined,
                badgeColor: 'bg-amber-500 text-slate-900 font-bold'
              }
            ]
          },
          {
            title: 'Team & Technicians',
            items: [
              
              { id: 'technicians', label: 'Teknisi & Tim', icon: UserCheck }
            ]
          },
          {
            title: 'Stock Opname',
            items: [
              { id: 'opname', label: 'Stock Opname & Audit', icon: Calculator }
            ]
          },
          {
            title: 'Reports & Analytics',
            items: [
              { id: 'reports', label: 'Laporan Bulanan', icon: FileSpreadsheet },
              { id: 'reports-movement', label: 'Audit Trail & Log', icon: History }
            ]
          },
          {
            title: 'Master Data',
            items: [
              { id: 'master-suppliers', label: 'Supplier & Vendor', icon: Truck },
              { id: 'master-projects', label: 'Project FTTH Cluster', icon: Briefcase },
              { id: 'master-categories', label: 'Kategori Barang', icon: Tags },
              { id: 'master-units', label: 'Satuan Unit', icon: Ruler }
            ]
          },
          {
            title: 'System & CI4',
            items: [
              { id: 'admin-users', label: 'Pengguna & Role', icon: ShieldCheck },
              { id: 'ci4-export', label: 'CodeIgniter 4 Schema', icon: FileCode, badge: 'PHP 8.x', badgeColor: 'bg-blue-900 text-blue-200 border border-blue-700' },
              { 
                id: 'system-logs', 
                label: 'Log Error & Diagnostik', 
                icon: Terminal, 
                badge: errorCount > 0 ? `${errorCount} Err` : undefined, 
                badgeColor: 'bg-red-600 text-white font-bold' 
              }
            ]
          }
        ];
    }
  };

  const menuSections = getAllowedSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/70 z-50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0F172A] text-white flex flex-col transition-transform duration-200 lg:translate-x-0 border-r border-slate-800 shadow-2xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <JetCyberLogo variant="horizontal" size="sm" theme="dark" />

          {handleClose && (
            <button
              onClick={handleClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Scrollable Nav Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="px-3 mb-1 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'modems' && activeTab === 'inventory-modem') ||
                    (item.id === 'cables' && activeTab === 'inventory-kabel') ||
                    (item.id === 'general' && activeTab === 'inventory-umum') ||
                    (item.id === 'opname' && activeTab === 'stock-opname') ||
                    (item.id === 'admin-users' && activeTab === 'administration');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (handleClose) handleClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                            item.badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom User Profile Section */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
            </div>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

