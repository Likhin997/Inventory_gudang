import React, { useState } from 'react';
import {
  Bell,
  Search,
  PlusCircle,
  MinusCircle,
  QrCode,
  ShieldCheck,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Menu,
  Clock,
  Terminal
} from 'lucide-react';
import { InventoryService } from '../services/storageService';
import { logger } from '../utils/logger';
import { UserRole } from '../types/inventory';

interface NavbarProps {
  onOpenSidebar?: () => void;
  onOpenSearch: () => void;
  onOpenStockIn?: () => void;
  onOpenStockOut?: () => void;
  onOpenScanner: () => void;
  onNavigateTab: (tabId: string) => void;
  onLogout: () => void;
  onOpenErrorModal?: () => void;
  activeTab?: string;
  remainingSessionSeconds?: number;
  onExtendSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSidebar,
  onOpenSearch,
  onOpenStockIn,
  onOpenStockOut,
  onOpenScanner,
  onNavigateTab,
  onLogout,
  onOpenErrorModal,
  activeTab = 'dashboard',
  remainingSessionSeconds,
  onExtendSession
}) => {
  const service = InventoryService.getInstance();
  const currentUser = service.currentUser;
  const notifications = service.notifications;
  const unreadCount = notifications.filter(n => !n.read).length;
  const [errorCount, setErrorCount] = useState(() => logger.getLogs().filter(l => l.level === 'error').length);

  React.useEffect(() => {
    return logger.subscribe(() => {
      setErrorCount(logger.getLogs().filter(l => l.level === 'error').length);
    });
  }, []);

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const formatRemaining = (seconds?: number) => {
    if (seconds === undefined) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getBreadcrumbTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { category: 'Dashboard', page: 'Network Operations Center Hub' };
      case 'inventory-all':
        return { category: 'Inventory', page: 'Semua Katalog Barang & Stok' };
      case 'modems':
      case 'inventory-modem':
        return { category: 'Inventory', page: 'Modem / ONT & Serial Number' };
      case 'cables':
      case 'inventory-kabel':
        return { category: 'Inventory', page: 'Kabel Fiber Optik & Dropcore' };
      case 'general':
      case 'inventory-umum':
        return { category: 'Inventory', page: 'Aksesoris & Peralatan Umum' };
      case 'stock-in':
        return { category: 'Transaksi', page: 'Formulir Barang Masuk (Inbound)' };
      case 'stock-out':
        return { category: 'Transaksi', page: 'Formulir Barang Keluar (Outbound)' };
      case 'opname':
      case 'stock-opname':
        return { category: 'Audit', page: 'Stock Opname Fisik & Rekonsiliasi' };
      case 'approvals':
      case 'requisitions':
        return { category: 'Approval', page: 'Persetujuan Pengajuan Barang' };
      case 'reports':
      case 'reports-team':
      case 'reports-movement':
        return { category: 'Laporan', page: 'Rekapitulasi & Analisis Pemakaian' };
      case 'teams':
      case 'technicians':
        return { category: 'Tim Lapangan', page: 'Manajemen Tim & Teknisi' };
      case 'teamMaterials':
      case 'team-materials':
        return { category: 'Tim Lapangan', page: 'Tracking Material & Log Tim' };
      case 'master-suppliers':
      case 'master-projects':
      case 'master-categories':
      case 'master-units':
        return { category: 'Master Data', page: 'Konfigurasi Referensi Sistem' };
      case 'admin-users':
      case 'administration':
        return { category: 'Sistem', page: 'Manajemen Pengguna & Role' };
      case 'ci4-export':
        return { category: 'Integrasi', page: 'CodeIgniter 4 Backend Schema' };
      default:
        return { category: 'Logistik ISP', page: 'Warehouse Management' };
    }
  };

  const breadcrumb = getBreadcrumbTitle(activeTab);

  const roleColors: Record<UserRole, string> = {
    SUPERADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
    ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
    GUDANG: 'bg-amber-100 text-amber-700 border-amber-200',
    TEKNISI: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };

  const roleLabels: Record<UserRole, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Administrator',
    GUDANG: 'Admin Gudang',
    TEKNISI: 'Teknisi Lapangan'
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-xs">
      {/* Left: Mobile Toggle & Breadcrumb Navigation */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            title="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="flex items-center hover:opacity-90 transition-opacity cursor-pointer border-0 bg-transparent p-0"
              title="Jet Cyber Network"
            >
              <img
                src="/jetcyber-logo.svg"
                alt="Jet Cyber Network - Reach Without Limits"
                className="h-10 sm:h-11 w-auto object-contain select-none"
              />
            </button>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <span className="text-slate-700 font-semibold text-xs sm:text-sm hidden sm:inline-block">
              {breadcrumb.page}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>NOC Live</span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar Trigger */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span>Cari SN Modem, Kabel, Item...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-200">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Notifications & User */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
          title="Cari"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* QR / Barcode Scanner */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          title="Scan Barcode / QR Modem"
        >
          <QrCode className="h-3.5 w-3.5 text-blue-600" />
          <span className="hidden sm:inline">Scan SN</span>
        </button>

        {/* Inactivity Session Status Pill */}
        {remainingSessionSeconds !== undefined && (
          <button
            onClick={onExtendSession}
            title={`Sisa waktu sesi aktif tanpa aktivitas: ${formatRemaining(remainingSessionSeconds)}. Klik untuk mereset ke 30 menit.`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              remainingSessionSeconds <= 120
                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${remainingSessionSeconds <= 120 ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline text-[11px]">Sesi:</span>
            <span className="font-mono text-[11px] font-semibold">{formatRemaining(remainingSessionSeconds)}</span>
          </button>
        )}

        {/* Quick Add Inbound/Outbound */}
        {onOpenStockIn && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') && (
          <button
            onClick={onOpenStockIn}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Barang Masuk</span>
          </button>
        )}

        {/* Error Log & Diagnostics Button */}
        {onOpenErrorModal && (
          <button
            onClick={onOpenErrorModal}
            title="Buka Log Error & Diagnostik Sistem"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
              errorCount > 0
                ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Terminal className={`h-4 w-4 ${errorCount > 0 ? 'text-red-600' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">Log Error</span>
            {errorCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                {errorCount}
              </span>
            )}
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
            title="Notifikasi"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notif Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Notifikasi</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>
                <button
                  onClick={() => service.markAllNotificationsRead()}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  Tandai dibaca
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">Tidak ada notifikasi</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        service.markNotificationAsRead(n.id);
                        if (n.linkTab) onNavigateTab(n.linkTab);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                        !n.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {n.type === 'LOW_STOCK' || n.type === 'OUT_OF_STOCK' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : n.type === 'STOCK_IN' ? (
                            <PlusCircle className="h-4 w-4 text-emerald-600" />
                          ) : n.type === 'STOCK_OUT' ? (
                            <MinusCircle className="h-4 w-4 text-rose-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center space-x-2 p-1 sm:px-2.5 sm:py-1 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 font-medium">{roleLabels[currentUser.role]}</div>
            </div>
          </button>

          {/* User Switch Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-xl py-2 z-50 text-slate-800">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Simulasi Peran / User Switch</p>
                <p className="text-[11px] text-slate-500">Pilih akun untuk menguji role:</p>
              </div>

              <div className="p-2 space-y-2">
                <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-md border border-blue-100">
                  <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500">{currentUser.email}</p>
                  </div>
                </div>
                
                {/* Inactivity Session Box */}
                {remainingSessionSeconds !== undefined && (
                  <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700 text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        Status Sesi (30 Menit)
                      </span>
                      <span className={`font-mono text-[11px] font-bold ${remainingSessionSeconds <= 120 ? 'text-amber-600' : 'text-blue-600'}`}>
                        {formatRemaining(remainingSessionSeconds)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Sistem akan logout otomatis jika tidak ada aktivitas selama 30 menit.
                    </p>
                    {onExtendSession && (
                      <button
                        onClick={() => {
                          onExtendSession();
                        }}
                        className="w-full text-center py-1 rounded bg-white hover:bg-slate-100 text-blue-600 text-[10px] font-bold border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                      >
                        🔄 Perpanjang Sesi Sekarang
                      </button>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-center p-2 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium text-xs border border-rose-200 transition-colors cursor-pointer"
                >
                  Keluar Sistem (Logout)
                </button>
              </div>

              <div className="border-t border-slate-100 px-3 pt-2 mt-1 flex items-center justify-end text-[11px]">
                <button
                  onClick={() => {
                    onNavigateTab('ci4-export');
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  <FileCode className="h-3 w-3" />
                  <span>Code CI4</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

