import React, { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/views/LoginView';
import { InventoryService } from './services/storageService';
import { Item, ModemSerialNumber } from './types/inventory';
import { ErrorLogModal, FloatingDiagnosticButton } from './components/modals/ErrorLogModal';
import { getPathFromTab, getTabFromPath, getTitleFromTab, normalizeTabId } from './utils/routes';

// Lazy-loaded Views for minimal initial bundle & lightning-fast startup
const DashboardView = lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const InventoryAllView = lazy(() => import('./components/views/InventoryAllView').then(m => ({ default: m.InventoryAllView })));
const ModemManagementView = lazy(() => import('./components/views/ModemManagementView').then(m => ({ default: m.ModemManagementView })));
const CableManagementView = lazy(() => import('./components/views/CableManagementView').then(m => ({ default: m.CableManagementView })));
const GeneralItemsView = lazy(() => import('./components/views/GeneralItemsView').then(m => ({ default: m.GeneralItemsView })));
const StockInView = lazy(() => import('./components/views/StockInView').then(m => ({ default: m.StockInView })));
const StockOutView = lazy(() => import('./components/views/StockOutView').then(m => ({ default: m.StockOutView })));
const StockOpnameView = lazy(() => import('./components/views/StockOpnameView').then(m => ({ default: m.StockOpnameView })));
const RequisitionApprovalView = lazy(() => import('./components/views/RequisitionApprovalView').then(m => ({ default: m.RequisitionApprovalView })));
const ReportsView = lazy(() => import('./components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const TechnicianView = lazy(() => import('./components/views/TechnicianView').then(m => ({ default: m.TechnicianView })));
const TeamMaterialsView = lazy(() => import('./components/views/TeamMaterialsView').then(m => ({ default: m.TeamMaterialsView })));
const MasterDataView = lazy(() => import('./components/views/MasterDataView').then(m => ({ default: m.MasterDataView })));
const AdministrationView = lazy(() => import('./components/views/AdministrationView').then(m => ({ default: m.AdministrationView })));
const CI4ExportView = lazy(() => import('./components/views/CI4ExportView').then(m => ({ default: m.CI4ExportView })));

// Modals
const BarcodeScannerModal = lazy(() => import('./components/modals/BarcodeScannerModal').then(m => ({ default: m.BarcodeScannerModal })));
const GlobalSearchModal = lazy(() => import('./components/modals/GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));

// 30 Menit Batas Waktu Tidak Ada Aktivitas (Inactivity Timeout)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export default function App() {
  const service = InventoryService.getInstance();

  // Force re-render on singleton changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = service.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, [service]);

  // Auth State & Session Timeout
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [remainingSessionSeconds, setRemainingSessionSeconds] = useState<number>(30 * 60);

  const lastActivityRef = useRef<number>(Date.now());
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const performLogout = useCallback((reasonMsg?: string) => {
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('last_activity');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_activity');
    service.currentUser = { id: '', username: '', role: 'GUDANG', name: '', email: '', active: false, createdAt: new Date().toISOString() };
    setSessionExpiredMessage(reasonMsg || 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.');
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    if (window.location.pathname !== '/login') {
      window.history.replaceState({ tab: 'login' }, '', '/login');
    }
    document.title = 'Login - Jet Cyber Network';
  }, [service]);

  const handleExtendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    sessionStorage.setItem('last_activity', now.toString());
    setRemainingSessionSeconds(30 * 60);
  }, []);

  // Session verification from sessionStorage (requires fresh login on first visit / new browser session)
  useEffect(() => {
    // Clean up any legacy persistent localStorage auth keys so first visit always requires login
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_activity');

    const storedUser = sessionStorage.getItem('auth_user');
    const storedLastActivity = sessionStorage.getItem('last_activity');
    const now = Date.now();

    if (storedUser && storedLastActivity) {
      const lastActivityTime = parseInt(storedLastActivity, 10);

      // Cek apakah sesi sudah kedaluwarsa (> 30 menit tanpa aktivitas) atau timestamp tidak valid
      if (!lastActivityTime || isNaN(lastActivityTime) || now - lastActivityTime >= INACTIVITY_TIMEOUT_MS) {
        sessionStorage.removeItem('auth_user');
        sessionStorage.removeItem('last_activity');
        if (lastActivityTime > 0 && now - lastActivityTime >= INACTIVITY_TIMEOUT_MS) {
          setSessionExpiredMessage('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.');
        }
        setIsAuthenticated(false);
      } else {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id && user.username && user.active !== false) {
            service.currentUser = user;
            lastActivityRef.current = lastActivityTime;
            const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - (now - lastActivityTime)) / 1000));
            setRemainingSessionSeconds(remaining);
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('auth_user');
            sessionStorage.removeItem('last_activity');
            setIsAuthenticated(false);
          }
        } catch (e) {
          sessionStorage.removeItem('auth_user');
          sessionStorage.removeItem('last_activity');
          setIsAuthenticated(false);
        }
      }
    } else {
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('last_activity');
      setIsAuthenticated(false);
    }
  }, [service]);

  // Pantau aktivitas pengguna secara akurat (menghindari jitter mouse & synthetic event dari re-render)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRecordActivity = (e?: Event) => {
      const now = Date.now();
      const storedLast = sessionStorage.getItem('last_activity');
      const lastTime = storedLast ? parseInt(storedLast, 10) : lastActivityRef.current;
      const elapsed = now - lastTime;

      // 1. Jika sudah kedaluwarsa (>= 30 menit), JANGAN catat aktivitas! Langsung logout!
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performLogout('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.');
        return;
      }

      // 2. Filter gerakan mouse: abaikan jitter sensor optik (< 15px) atau event synthetic saat re-render
      if (e && e.type === 'mousemove') {
        const me = e as MouseEvent;
        const dx = Math.abs(me.clientX - lastMousePosRef.current.x);
        const dy = Math.abs(me.clientY - lastMousePosRef.current.y);
        if (dx < 15 && dy < 15) return; // gerakan terlalu kecil / getaran meja, abaikan
        lastMousePosRef.current = { x: me.clientX, y: me.clientY };
      }

      // 3. Catat aktivitas dan simpan ke sessionStorage setiap minimal 3 detik
      if (now - lastActivityRef.current > 3000) {
        lastActivityRef.current = now;
        sessionStorage.setItem('last_activity', now.toString());
      }
    };

    // Event interaksi nyata yang disengaja oleh user
    const trackedEvents = ['keydown', 'click', 'mousedown', 'touchstart', 'wheel'];
    trackedEvents.forEach(evt => {
      window.addEventListener(evt, checkAndRecordActivity, { passive: true });
    });

    const onMouseMove = (e: MouseEvent) => checkAndRecordActivity(e);
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Cek ketika user kembali ke tab browser atau laptop bangun dari sleep
    const onVisibilityOrFocus = () => {
      if (!document.hidden) {
        const now = Date.now();
        const storedLast = sessionStorage.getItem('last_activity');
        const lastTime = storedLast ? parseInt(storedLast, 10) : lastActivityRef.current;
        const elapsed = now - lastTime;

        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          performLogout('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.');
        } else {
          setRemainingSessionSeconds(Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000)));
        }
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    // Ticker interval setiap 1 detik untuk menghitung sisa waktu secara presisi
    const ticker = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
      setRemainingSessionSeconds(remaining);

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performLogout('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.');
      }
    }, 1000);

    return () => {
      trackedEvents.forEach(evt => {
        window.removeEventListener(evt, checkAndRecordActivity);
      });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      clearInterval(ticker);
    };
  }, [isAuthenticated, performLogout]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('last_activity');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('last_activity');
    service.currentUser = { id: '', username: '', role: 'GUDANG', name: '', email: '', active: false, createdAt: new Date().toISOString() };
    setSessionExpiredMessage(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
    if (window.location.pathname !== '/login') {
      window.history.replaceState({ tab: 'login' }, '', '/login');
    }
    document.title = 'Login - Jet Cyber Network';
  }, [service]);

  useEffect(() => {
    service.syncFromApi().then(() => {
      // Verify restored session user still exists and is active in the database
      if (service.currentUser?.id && service.users.length > 0) {
        const dbUser = service.users.find(
          (u) => u.id === service.currentUser.id || u.username === service.currentUser.username
        );
        if (!dbUser || dbUser.active === false) {
          sessionStorage.removeItem('auth_user');
          sessionStorage.removeItem('last_activity');
          service.currentUser = { id: '', username: '', role: 'GUDANG', name: '', email: '', active: false, createdAt: new Date().toISOString() };
          setIsAuthenticated(false);
        }
      }
    }).finally(() => setIsInitializing(false));
  }, [service]);

  // Active Tab navigation state synced with browser URL & history
  const [activeTab, setActiveTab] = useState<string>(() => getTabFromPath(window.location.pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global modals
  const [showScanner, setShowScanner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [errorModalDefaultTab, setErrorModalDefaultTab] = useState<'logs' | 'modems' | 'api'>('logs');

  // Inter-view payload states
  const [preselectedItem, setPreselectedItem] = useState<Item | null>(null);
  const [preselectedSN, setPreselectedSN] = useState<ModemSerialNumber | null>(null);

  // Keyboard shortcut for Search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync URL and document title on auth state change & handle browser Back/Forward (popstate)
  useEffect(() => {
    if (!isAuthenticated) {
      if (window.location.pathname === '/' || window.location.pathname === '/login') {
        window.history.replaceState({ tab: 'login' }, '', '/login');
      }
      document.title = 'Login - Jet Cyber Network';
      return;
    }

    const currentTab = getTabFromPath(window.location.pathname);
    const targetPath = getPathFromTab(currentTab);
    setActiveTab(currentTab);
    document.title = getTitleFromTab(currentTab);
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ tab: currentTab }, '', targetPath);
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextTab = event.state?.tab
        ? normalizeTabId(event.state.tab)
        : getTabFromPath(window.location.pathname);
      setActiveTab(nextTab);
      setSidebarOpen(false);
      setShowScanner(false);
      setShowSearch(false);
      document.title = getTitleFromTab(nextTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  const handleNavigate = (tabId: string, itemPayload?: Item | null, snPayload?: ModemSerialNumber | null) => {
    if (tabId === 'system-logs') {
      setErrorModalDefaultTab('logs');
      setShowErrorLogs(true);
      return;
    }
    const normalizedTab = normalizeTabId(tabId);
    const targetPath = getPathFromTab(normalizedTab);

    if (itemPayload !== undefined) {
      setPreselectedItem(itemPayload);
    }
    if (snPayload !== undefined) {
      setPreselectedSN(snPayload);
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: normalizedTab }, '', targetPath);
    }
    document.title = getTitleFromTab(normalizedTab);
    setActiveTab(normalizedTab);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScannedSN = (sn: ModemSerialNumber) => {
    setPreselectedSN(sn);
    handleNavigate('modems');
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">Memuat Sistem Inventory...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <LoginView
        sessionExpiredMessage={sessionExpiredMessage}
        onLogin={(user) => {
          sessionStorage.setItem('auth_user', JSON.stringify(user));
          localStorage.removeItem('explicit_logout');
          const now = Date.now();
          sessionStorage.setItem('last_activity', now.toString());
          lastActivityRef.current = now;
          setSessionExpiredMessage(null);
          const initialTab = getTabFromPath(window.location.pathname);
          const initialPath = getPathFromTab(initialTab);
          window.history.pushState({ tab: initialTab }, '', initialPath);
          document.title = getTitleFromTab(initialTab);
          setActiveTab(initialTab);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-900">
      {/* High Density Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        isOpenMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <Navbar
          activeTab={activeTab}
          onNavigateTab={handleNavigate}
          onLogout={handleLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenScanner={() => setShowScanner(true)}
          onOpenStockIn={() => handleNavigate('stock-in')}
          onOpenStockOut={() => handleNavigate('stock-out')}
          onOpenErrorModal={() => {
            setErrorModalDefaultTab('logs');
            setShowErrorLogs(true);
          }}
          remainingSessionSeconds={remainingSessionSeconds}
          onExtendSession={handleExtendSession}
        />

        {/* Inactivity Warning Banner (Active when <= 2 minutes remain) */}
        {remainingSessionSeconds <= 120 && remainingSessionSeconds > 0 && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between shadow-xs sticky top-16 z-20 transition-all">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 animate-pulse text-white" />
              <span>
                <strong>Peringatan Inaktivitas:</strong> Sesi Anda akan otomatis keluar dalam{' '}
                <span className="font-mono font-bold underline bg-amber-600 px-1.5 py-0.5 rounded">
                  {Math.floor(remainingSessionSeconds / 60)} menit {remainingSessionSeconds % 60} detik
                </span>{' '}
                karena tidak ada aktivitas. Klik tombol di kanan untuk melanjutkan.
              </span>
            </div>
            <button
              onClick={handleExtendSession}
              className="ml-3 px-3.5 py-1 bg-white text-amber-900 rounded font-bold hover:bg-amber-50 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              🔄 Perpanjang Sesi
            </button>
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">Memuat modul...</p>
            </div>
          }>
            {activeTab === 'dashboard' && (
              <DashboardView 
                onNavigateTab={handleNavigate} 
                onOpenStockIn={() => handleNavigate('stock-in')}
                onOpenStockOut={() => handleNavigate('stock-out')}
                onOpenScanner={() => setShowScanner(true)}
              />
            )}
            {activeTab === 'inventory-all' && (
              <InventoryAllView 
                onStockOut={(item) => handleNavigate('stock-out', item)} 
                onOpenStockOutItem={(item) => handleNavigate('stock-out', item)} 
              />
            )}
            {activeTab === 'modems' && (
              <ModemManagementView 
                forcedStatus="DIPINJAM_TEKNISI" 
                hideTabs={true} 
                onOpenModemOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onStockOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onOpenErrorModal={() => {
                  setErrorModalDefaultTab('modems');
                  setShowErrorLogs(true);
                }}
              />
            )}
            {activeTab === 'modems-terpasang' && (
              <ModemManagementView 
                forcedStatus="TERPASANG" 
                hideTabs={true} 
                disableBulkReturn={true} 
                onOpenModemOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onStockOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onOpenErrorModal={() => {
                  setErrorModalDefaultTab('modems');
                  setShowErrorLogs(true);
                }}
              />
            )}
            {activeTab === 'modems-rusak' && (
              <ModemManagementView 
                forcedStatus="RUSAK" 
                hideTabs={true} 
                onOpenModemOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onStockOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onOpenErrorModal={() => {
                  setErrorModalDefaultTab('modems');
                  setShowErrorLogs(true);
                }}
              />
            )}
            {activeTab === 'modems-all' && (
              <ModemManagementView 
                disableBulkReturn={true} 
                onOpenModemOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onStockOut={(item, sn) => handleNavigate('stock-out', item, sn)}
                onOpenErrorModal={() => {
                  setErrorModalDefaultTab('modems');
                  setShowErrorLogs(true);
                }}
              />
            )}
            {activeTab === 'cables' && <CableManagementView />}
            {activeTab === 'general' && (
              <GeneralItemsView 
                onOpenStockOutItem={(item) => handleNavigate('stock-out', item)} 
                onOpenStockInItem={(item) => handleNavigate('stock-in', item)} 
              />
            )}
            {(activeTab === 'teamMaterials' || activeTab === 'team-materials') && <TeamMaterialsView />}
            {activeTab === 'low-stock' && <InventoryAllView initialFilter="low-stock" />}
            {activeTab === 'stock-in' && <StockInView preselectedItem={preselectedItem} />}
            {activeTab === 'stock-out' && (
              <StockOutView 
                preselectedItem={preselectedItem} 
                preselectedSN={preselectedSN}
                onSuccess={() => {
                  setPreselectedItem(null);
                  setPreselectedSN(null);
                  handleNavigate('inventory-all');
                }} 
                onOpenErrorModal={() => {
                  setErrorModalDefaultTab('modems');
                  setShowErrorLogs(true);
                }}
              />
            )}
            {activeTab === 'requisitions' && <RequisitionApprovalView />}
            {activeTab === 'approvals' && <RequisitionApprovalView />}
            {activeTab === 'opname' && <StockOpnameView />}
            {activeTab === 'reports' && <ReportsView initialReportType="monthly" />}
            {activeTab === 'reports-team' && <ReportsView initialReportType="team-usage" />}
            {activeTab === 'reports-movement' && <ReportsView initialReportType="movement" />}
            {activeTab === 'technicians' && <TechnicianView />}
            {activeTab === 'master-suppliers' && <MasterDataView initialTab="suppliers" />}
            {activeTab === 'master-projects' && <MasterDataView initialTab="projects" />}
            {activeTab === 'master-categories' && <MasterDataView initialTab="categories" />}
            {activeTab === 'master-units' && <MasterDataView initialTab="units" />}
            {activeTab === 'admin-users' && <AdministrationView onNavigateTab={handleNavigate} />}
            {activeTab === 'ci4-export' && <CI4ExportView />}
          </Suspense>
        </main>
      </div>

      {/* Floating Diagnostics / Error Log Button */}
      <FloatingDiagnosticButton onClick={() => {
        setErrorModalDefaultTab('logs');
        setShowErrorLogs(true);
      }} />

      {/* Global Error Log & Diagnostics Modal */}
      <ErrorLogModal
        isOpen={showErrorLogs}
        onClose={() => setShowErrorLogs(false)}
        defaultTab={errorModalDefaultTab}
        onNavigateTab={handleNavigate}
      />

      {/* Global Barcode Scanner Modal */}
      <Suspense fallback={null}>
        {showScanner && (
          <BarcodeScannerModal
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onSelectSN={handleScannedSN}
          />
        )}

        {/* Global Search Modal (Cmd+K) */}
        {showSearch && (
          <GlobalSearchModal
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            onNavigateTab={handleNavigate}
          />
        )}
      </Suspense>
    </div>
  );
}

