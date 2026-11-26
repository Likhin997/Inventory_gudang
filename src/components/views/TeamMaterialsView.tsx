import React, { useState, useMemo } from 'react';
import {
  Factory,
  Search,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Download,
  Filter,
  Calendar,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  Clock,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  User
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import { StockTransaction } from '../../types/inventory';
import {
  formatDateTimeWIB,
  formatDateWIB,
  getDateInAsiaJakarta,
  getTodayInAsiaJakarta,
  getDaysAgoInAsiaJakarta,
  getMonthStartInAsiaJakarta,
  getMonthEndInAsiaJakarta
} from '../../utils/dateUtils';

export const TeamMaterialsView: React.FC = () => {
  const service = InventoryService.getInstance();
  const [, setTick] = useState(0);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'holdings' | 'movement_logs' | 'audit_logs'>('holdings');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SISA' | 'HABIS'>('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState<'ALL' | 'STOCK_OUT' | 'RETURN'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  // Urutan Tanggal: Default 'desc' (Tanggal terbaru yang di atas)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal State for Return
  const [returnModal, setReturnModal] = useState<{
    matId: string;
    itemName: string;
    maxQty: number;
    unit: string;
    techName: string;
  } | null>(null);
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnNotes, setReturnNotes] = useState<string>('');

  // Modal State for Tandai Habis (Tanpa Wajib Nama Pelanggan)
  const [depleteModal, setDepleteModal] = useState<{
    matId: string;
    itemName: string;
    techName: string;
    quantity: number;
    unit: string;
    dateIssued: string;
  } | null>(null);
  const [depleteNotes, setDepleteNotes] = useState<string>('');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    return service.subscribe(() => {
      setTick(t => t + 1);
    });
  }, [service]);

  // Flash message helper
  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // 1. Filtered Holdings (Material Aktif Tim) - Diurutkan berdasarkan tanggal terbaru di atas
  const filteredMaterials = useMemo(() => {
    const teamObj = (service.teams || []).find(t => t.id === selectedTeam);
    const techObj = (service.technicians || []).find(t => t.id === selectedTeam);
    const allowedIds = new Set<string>([selectedTeam]);
    const allowedNames = new Set<string>();

    if (teamObj) {
      allowedNames.add(teamObj.name.toLowerCase());
      if (teamObj.leader) allowedNames.add(teamObj.leader.toLowerCase());
      (teamObj.members || []).forEach(m => allowedIds.add(m));
      (service.technicians || []).filter(t => t.teamId === teamObj.id).forEach(t => {
        allowedIds.add(t.id);
        allowedNames.add(t.name.toLowerCase());
      });
    }

    if (techObj) {
      allowedNames.add(techObj.name.toLowerCase());
      if (techObj.teamId) allowedIds.add(techObj.teamId);
    }

    return (service.teamMaterials || []).filter(mat => {
      const item = service.items.find(i => i.id === mat.itemId);
      const catType = item?.categoryType || '';

      if (categoryFilter !== 'ALL' && catType !== categoryFilter) {
        return false;
      }

      if (selectedTeam !== 'ALL') {
        const matchesId = (mat.techId && allowedIds.has(mat.techId)) || (mat.teamId && allowedIds.has(mat.teamId));
        const matchesName = (mat.techName && allowedNames.has(mat.techName.toLowerCase())) ||
                            (mat.teamName && allowedNames.has(mat.teamName.toLowerCase()));
        if (!matchesId && !matchesName) return false;
      }

      if (statusFilter !== 'ALL' && mat.status !== statusFilter) {
        return false;
      }

      // Filter Tanggal in Asia/Jakarta
      const matDate = getDateInAsiaJakarta(mat.dateIssued) || (mat.dateIssued || '').slice(0, 10);
      if (startDate && matDate < startDate) return false;
      if (endDate && matDate > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchItem = mat.itemName?.toLowerCase().includes(q);
        const matchTech = mat.techName?.toLowerCase().includes(q);
        const matchNotes = mat.notes?.toLowerCase().includes(q);
        const matchCat = catType.toLowerCase().includes(q);
        if (!matchItem && !matchTech && !matchNotes && !matchCat) return false;
      }
      return true;
    }).sort((a, b) => {
      // Urutan tanggal: Default 'desc' (terbaru di atas)
      const parseDateVal = (dStr: string) => {
        if (!dStr) return 0;
        const t = new Date(dStr).getTime();
        return isNaN(t) ? 0 : t;
      };
      const dateA = parseDateVal(a.dateIssued);
      const dateB = parseDateVal(b.dateIssued);

      if (dateA !== dateB) {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }

      // Fallback: perbandingan string tanggal
      const strCmp = (b.dateIssued || '').localeCompare(a.dateIssued || '');
      if (strCmp !== 0) {
        return sortOrder === 'desc' ? strCmp : -strCmp;
      }

      // Fallback: timestamp dari ID
      const extractNum = (idStr: string) => {
        const m = (idStr || '').match(/\d{10,13}/);
        return m ? parseInt(m[0], 10) : 0;
      };
      const idDiff = extractNum(b.id) - extractNum(a.id);
      return sortOrder === 'desc' ? idDiff : -idDiff;
    });
  }, [service.teamMaterials, service.items, service.teams, service.technicians, categoryFilter, selectedTeam, statusFilter, startDate, endDate, searchTerm, sortOrder]);

  // 2. Filtered Team Transaction Movement Logs
  const teamTransactions = useMemo(() => {
    const teamObj = (service.teams || []).find(t => t.id === selectedTeam);
    const techObj = (service.technicians || []).find(t => t.id === selectedTeam);
    const allowedIds = new Set<string>([selectedTeam]);
    const allowedNames = new Set<string>();

    if (teamObj) {
      allowedNames.add(teamObj.name.toLowerCase());
      if (teamObj.leader) allowedNames.add(teamObj.leader.toLowerCase());
      (teamObj.members || []).forEach(m => allowedIds.add(m));
      (service.technicians || []).filter(t => t.teamId === teamObj.id).forEach(t => {
        allowedIds.add(t.id);
        allowedNames.add(t.name.toLowerCase());
      });
    }

    if (techObj) {
      allowedNames.add(techObj.name.toLowerCase());
      if (techObj.teamId) allowedIds.add(techObj.teamId);
    }

    return (service.transactions || []).filter(trx => {
      // Must involve a team/technician or be a material return
      const hasTeam = trx.techId || trx.teamId || trx.techName || trx.teamName;
      const isTeamReturn = trx.type === 'RETURN';
      const isTeamOut = trx.type === 'STOCK_OUT' && (hasTeam || trx.purpose?.toLowerCase().includes('tim'));
      
      if (!hasTeam && !isTeamReturn && !isTeamOut) return false;

      // Filter by Category
      if (categoryFilter !== 'ALL' && trx.categoryType !== categoryFilter) {
        return false;
      }

      // Filter by Team
      if (selectedTeam !== 'ALL') {
        const matchesId = (trx.techId && allowedIds.has(trx.techId)) || (trx.teamId && allowedIds.has(trx.teamId));
        const matchesName = (trx.techName && allowedNames.has(trx.techName.toLowerCase())) ||
                            (trx.teamName && allowedNames.has(trx.teamName.toLowerCase()));
        if (!matchesId && !matchesName) return false;
      }

      // Filter by Transaction Type
      if (logTypeFilter !== 'ALL' && trx.type !== logTypeFilter) {
        return false;
      }

      // Filter by Date in Asia/Jakarta
      const trxDate = getDateInAsiaJakarta(trx.date) || (trx.date || '').slice(0, 10);
      if (startDate && trxDate < startDate) return false;
      if (endDate && trxDate > endDate) return false;

      // Filter by Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchItem = trx.itemName?.toLowerCase().includes(q);
        const matchNum = trx.transactionNumber?.toLowerCase().includes(q);
        const matchTech = trx.techName?.toLowerCase().includes(q) || trx.teamName?.toLowerCase().includes(q);
        const matchNotes = trx.notes?.toLowerCase().includes(q) || trx.purpose?.toLowerCase().includes(q);
        if (!matchItem && !matchNum && !matchTech && !matchNotes) return false;
      }

      return true;
    });
  }, [service.transactions, service.teams, service.technicians, selectedTeam, logTypeFilter, startDate, endDate, searchTerm]);

  // 3. Filtered Audit Logs for Team Materials
  const teamAuditLogs = useMemo(() => {
    const teamObj = (service.teams || []).find(t => t.id === selectedTeam);
    const techObj = (service.technicians || []).find(t => t.id === selectedTeam);
    const allowedIds = new Set<string>([selectedTeam]);
    const allowedNames = new Set<string>();

    if (teamObj) {
      allowedNames.add(teamObj.name.toLowerCase());
      if (teamObj.leader) allowedNames.add(teamObj.leader.toLowerCase());
      (teamObj.members || []).forEach(m => allowedIds.add(m));
      (service.technicians || []).filter(t => t.teamId === teamObj.id).forEach(t => {
        allowedIds.add(t.id);
        allowedNames.add(t.name.toLowerCase());
      });
    }

    if (techObj) {
      allowedNames.add(techObj.name.toLowerCase());
      if (techObj.teamId) allowedIds.add(techObj.teamId);
    }

    return (service.auditLogs || []).filter(log => {
      const isMaterialOrTeam =
        log.entity === 'MATERIAL' ||
        log.entity === 'TEAM_MATERIAL' ||
        log.action.includes('TEAM_') ||
        log.details.toLowerCase().includes('tim') ||
        log.details.toLowerCase().includes('teknisi') ||
        log.details.toLowerCase().includes('pengembalian');

      if (!isMaterialOrTeam) return false;

      // Filter by Team
      if (selectedTeam !== 'ALL') {
        let matchTeam = false;
        if (log.entityId && allowedIds.has(log.entityId)) matchTeam = true;
        for (const name of allowedNames) {
          if (name && (log.details?.toLowerCase().includes(name) || log.userName?.toLowerCase().includes(name))) {
            matchTeam = true;
            break;
          }
        }
        if (!matchTeam) return false;
      }

      // Filter by Date in Asia/Jakarta
      const logDate = getDateInAsiaJakarta(log.timestamp);
      if (startDate && logDate && logDate < startDate) return false;
      if (endDate && logDate && logDate > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchUser = log.userName?.toLowerCase().includes(q);
        if (!matchAction && !matchDetails && !matchUser) return false;
      }

      return true;
    });
  }, [service.auditLogs, service.teams, service.technicians, selectedTeam, startDate, endDate, searchTerm]);

  // Summary Metrics
  const activeHoldingCount = (service.teamMaterials || []).filter(m => m.status === 'SISA').length;
  const depletedHoldingCount = (service.teamMaterials || []).filter(m => m.status === 'HABIS').length;
  const totalReturnTrx = (service.transactions || []).filter(t => t.type === 'RETURN').length;
  const totalTeamOutTrx = (service.transactions || []).filter(t => t.type === 'STOCK_OUT' && (t.techId || t.teamId)).length;

  // Actions
  const handleDeleteMaterial = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus data tracking material "${name}" ini? Data akan dihapus secara permanen.`)) {
      try {
        service.deleteTeamMaterial(id);
        setTick(t => t + 1);
        showNotification(`Data tracking material ${name} berhasil dihapus.`);
        if (typeof service.syncToApi === 'function') {
          service.syncToApi().catch(console.error);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'SISA' | 'HABIS') => {
    try {
      service.updateTeamMaterialStatus(id, newStatus);
      setTick(t => t + 1);
      showNotification(`Status material berhasil diubah menjadi ${newStatus}.`);
      if (typeof service.syncToApi === 'function') {
        service.syncToApi().catch(console.error);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status');
    }
  };

  const handleConfirmDeplete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!depleteModal) return;

    try {
      const note = depleteNotes.trim() || undefined;
      service.updateTeamMaterialStatus(depleteModal.matId, 'HABIS', note);
      setTick(t => t + 1);
      showNotification(`Material "${depleteModal.itemName}" (${depleteModal.techName}) berhasil ditandai HABIS.`);
      if (typeof service.syncToApi === 'function') {
        service.syncToApi().catch(console.error);
      }
      setDepleteModal(null);
      setDepleteNotes('');
    } catch (err: any) {
      alert(err.message || 'Gagal menandai material habis');
    }
  };

  const handleProcessReturn = async () => {
    if (!returnModal || returnQty <= 0 || returnQty > returnModal.maxQty) return;

    try {
      service.returnTeamMaterial(returnModal.matId, returnQty, returnNotes);
      setTick(t => t + 1);
      showNotification(
        `Berhasil mengembalikan ${returnQty} ${returnModal.unit} "${returnModal.itemName}" ke stok gudang!`
      );
      if (typeof service.syncToApi === 'function') {
        service.syncToApi().catch(console.error);
      }
      setReturnModal(null);
      setReturnQty(0);
      setReturnNotes('');
    } catch (err: any) {
      alert(err.message || 'Gagal memproses pengembalian material');
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    const holdingsData = filteredMaterials.map(m => {
      const item = service.items.find(i => i.id === m.itemId);
      return {
        'Tanggal Serah Terima': m.dateIssued,
        'Tim / Teknisi': m.techName,
        'Kategori': item?.categoryType || 'MATERIAL',
        'Nama Barang': m.itemName,
        'Jumlah': m.quantity,
        'Satuan': m.unit,
        'Status': m.status,
        'Tanggal Habis': m.dateDepleted || '-',
        'Catatan': m.notes || '-'
      };
    });

    const logsData = teamTransactions.map(t => ({
      'No. Transaksi': t.transactionNumber,
      'Tanggal': (t.date || '').slice(0, 10),
      'Tipe Mutasi': t.type === 'STOCK_OUT' ? 'PENGELUARAN KE TIM' : t.type === 'RETURN' ? 'PENGEMBALIAN DARI TIM' : t.type,
      'Tim / Teknisi': t.techName || t.teamName || '-',
      'Nama Barang': t.itemName,
      'Kategori': t.categoryType,
      'Jumlah': t.quantity,
      'Satuan': t.unit,
      'Stok Sebelum': t.stockBefore,
      'Stok Sesudah': t.stockAfter,
      'Pelaksana': t.performedBy,
      'Keperluan': t.purpose || '-',
      'Catatan': t.notes || '-'
    }));

    exportToExcel(`Tracking_Material_Tim_${new Date().toISOString().slice(0, 10)}`, [
      { sheetName: 'Stok Material Tim', data: holdingsData },
      { sheetName: 'Log Mutasi Material Tim', data: logsData }
    ]);
  };

  const handleExportCSV = () => {
    const logsData = teamTransactions.map(t => ({
      transaction_number: t.transactionNumber,
      date: (t.date || '').slice(0, 10),
      type: t.type,
      team_or_technician: t.techName || t.teamName || '',
      item_name: t.itemName,
      quantity: t.quantity,
      unit: t.unit,
      performed_by: t.performedBy,
      purpose: t.purpose || '',
      notes: t.notes || ''
    }));

    exportToCSV(`Log_Material_Tim_${new Date().toISOString().slice(0, 10)}`, logsData);
  };

  // Jump from row to logs
  const handleFilterLogForMat = (itemName: string) => {
    setSearchTerm(itemName);
    setActiveTab('movement_logs');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Factory className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tracking Material Tim</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring stok material tim, pencatatan sisa & pengembalian ke gudang, serta rekaman log mutasi terintegrasi.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            title="Export Excel (Data Material & Log Mutasi)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            title="Export CSV Log Transaksi"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Material Aktif (Sisa)</div>
            <div className="text-2xl font-black text-purple-700 mt-1">{activeHoldingCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Berada di tangan tim</div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Boxes className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Material Habis Pakai</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{depletedHoldingCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tuntas digunakan di lapangan</div>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pengeluaran ke Tim</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalTeamOutTrx}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Transaksi serah terima</div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <ArrowUpFromLine className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pengembalian (Return)</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{totalReturnTrx}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Material kembali ke gudang</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowDownToLine className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/75 px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x -mb-px ${
              activeTab === 'holdings'
                ? 'bg-white text-purple-700 border-slate-200 border-t-2 border-t-purple-600 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Stok Material Tim</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 font-mono">
              {filteredMaterials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('movement_logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x -mb-px ${
              activeTab === 'movement_logs'
                ? 'bg-white text-blue-700 border-slate-200 border-t-2 border-t-blue-600 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Log Mutasi Material Tim</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-mono">
              {teamTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x -mb-px ${
              activeTab === 'audit_logs'
                ? 'bg-white text-slate-900 border-slate-200 border-t-2 border-t-slate-700 shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Audit Trail & Log Aktivitas</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {teamAuditLogs.length}
            </span>
          </button>
        </div>

        {/* Global Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'holdings'
                    ? 'Cari nama barang, nama tim/teknisi, atau catatan...'
                    : activeTab === 'movement_logs'
                    ? 'Cari no. transaksi, barang, teknisi, keperluan...'
                    : 'Cari aksi log, entitas, rincian aktivitas...'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Team / Tech Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Semua Tim & Teknisi</option>
                <optgroup label="Tim">
                  {(service.teams || []).map((t, idx) => (
                    <option key={`tm-team-${t.id}-${idx}`} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Teknisi">
                  {(service.technicians || []).map((t, idx) => (
                    <option key={`tm-tech-${t.id}-${idx}`} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-44">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="PASIF">Pasif FTTH</option>
                <option value="AKSESORIS">Aksesoris</option>
                <option value="BARANG_UMUM">Barang Umum</option>
                <option value="BARANG_TEKNISI">Barang Teknisi</option>
                <option value="QUANTITY">Quantity Lainnya</option>
              </select>
            </div>

            {/* Conditional Tab Specific Filters */}
            {activeTab === 'holdings' && (
              <div className="w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SISA">Hanya Sisa (Aktif)</option>
                  <option value="HABIS">Hanya Habis</option>
                </select>
              </div>
            )}

            {activeTab === 'movement_logs' && (
              <div className="w-full sm:w-48">
                <select
                  value={logTypeFilter}
                  onChange={e => setLogTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Mutasi</option>
                  <option value="STOCK_OUT">Barang Keluar ke Tim</option>
                  <option value="RETURN">Pengembalian ke Gudang</option>
                </select>
              </div>
            )}
          </div>

          {/* Date Range & Sort for All Tabs */}
          {(activeTab === 'holdings' || activeTab === 'movement_logs' || activeTab === 'audit_logs') && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-purple-600" /> Filter Tanggal:
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-slate-800"
                />
                <span className="text-slate-400 text-xs">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-slate-800"
                />
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayInAsiaJakarta();
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getTodayInAsiaJakarta() && endDate === getTodayInAsiaJakarta()
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(getDaysAgoInAsiaJakarta(6));
                      setEndDate(getTodayInAsiaJakarta());
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getDaysAgoInAsiaJakarta(6) && endDate === getTodayInAsiaJakarta()
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(getMonthStartInAsiaJakarta());
                      setEndDate(getMonthEndInAsiaJakarta());
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getMonthStartInAsiaJakarta() && endDate === getMonthEndInAsiaJakarta()
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Bulan Ini
                  </button>
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer ml-1"
                    >
                      Reset Tanggal
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'holdings' && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs font-medium">Urutan Tanggal:</span>
                  <button
                    type="button"
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                    title="Klik untuk mengubah urutan tanggal"
                  >
                    {sortOrder === 'desc' ? (
                      <>
                        <ArrowDown className="h-3.5 w-3.5 text-purple-600" />
                        <span>Tanggal Terbaru di Atas</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3.5 w-3.5 text-purple-600" />
                        <span>Tanggal Terlama di Atas</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: STOK MATERIAL TIM (HOLDINGS) */}
        {activeTab === 'holdings' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th
                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none group transition-colors"
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="Klik untuk membalik urutan tanggal"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tanggal Diberikan</span>
                      {sortOrder === 'desc' ? (
                        <span className="inline-flex items-center text-purple-700 font-bold text-[9px] bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                          <ArrowDown className="h-3 w-3 mr-0.5" /> Terbaru
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-600 font-bold text-[9px] bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300">
                          <ArrowUp className="h-3 w-3 mr-0.5" /> Terlama
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3">Nama Tim / Teknisi</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Sisa / Jumlah</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi & Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(mat => {
                  const item = service.items.find(i => i.id === mat.itemId);
                  const itemCat = item?.categoryType || 'MATERIAL';
                  return (
                  <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {mat.dateIssued}
                      {mat.dateDepleted && (
                        <div className="text-[10px] text-red-500 font-medium">Habis: {mat.dateDepleted}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {mat.techName || mat.teamName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{mat.itemName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider ${
                          itemCat === 'PASIF'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                            : itemCat === 'AKSESORIS'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : itemCat === 'BARANG_TEKNISI'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {itemCat}
                        </span>
                        {item?.code && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-900 font-bold border border-slate-200">
                        {mat.quantity} {mat.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={mat.notes || '-'}>
                      {mat.notes || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        mat.status === 'SISA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {mat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end items-center gap-1.5">
                        {/* Jump to logs button */}
                        <button
                          onClick={() => handleFilterLogForMat(mat.itemName)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Lihat riwayat mutasi barang ini"
                        >
                          <History className="h-3 w-3" />
                          <span>Log</span>
                        </button>

                        {mat.status === 'SISA' && (
                          <>
                            <button
                              onClick={() => {
                                setReturnModal({
                                  matId: mat.id,
                                  itemName: mat.itemName,
                                  maxQty: mat.quantity,
                                  unit: mat.unit,
                                  techName: mat.techName || mat.teamName
                                });
                                setReturnQty(mat.quantity);
                                setReturnNotes('');
                              }}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Kembalikan
                            </button>
                            <button
                              onClick={() => {
                                setDepleteModal({
                                  matId: mat.id,
                                  itemName: mat.itemName,
                                  techName: mat.techName || mat.teamName,
                                  quantity: mat.quantity,
                                  unit: mat.unit,
                                  dateIssued: mat.dateIssued
                                });
                                setDepleteNotes('');
                              }}
                              className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              title="Tandai material telah habis terpakai"
                            >
                              Tandai Habis
                            </button>
                          </>
                        )}

                        {service.currentUser?.role === 'SUPERADMIN' && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id, mat.itemName)}
                            className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors ml-1"
                            title="Hapus Data Material"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p>Tidak ada data stok material tim yang cocok dengan filter pencarian.</p>
                      {(service.teamMaterials || []).length === 0 && teamTransactions.length > 0 && (
                        <div className="mt-4 flex flex-col items-center gap-2">
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg max-w-lg">
                            Ditemukan <strong>{teamTransactions.length}</strong> log mutasi material tim, namun tabel stok material tim kosong (biasanya akibat restore dari file backup versi lama).
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const count = service.rebuildTeamMaterialsFromHistory(true);
                              showNotification(`Berhasil memulihkan ${count} data stok material tim dari riwayat transaksi!`);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Pulihkan Stok Material Tim dari Riwayat Transaksi</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: LOG MUTASI MATERIAL TIM (MOVEMENT LOGS) */}
        {activeTab === 'movement_logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal & Jam</th>
                  <th className="px-4 py-3">No. Transaksi</th>
                  <th className="px-4 py-3">Tipe Mutasi</th>
                  <th className="px-4 py-3">Tim / Teknisi</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3">Stok Gudang</th>
                  <th className="px-4 py-3">Pelaksana</th>
                  <th className="px-4 py-3">Catatan / Keperluan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamTransactions.map(trx => {
                  const isStockOut = trx.type === 'STOCK_OUT';
                  const isReturn = trx.type === 'RETURN';

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                        {formatDateTimeWIB(trx.date)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {trx.transactionNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isStockOut && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <ArrowUpFromLine className="h-3 w-3" />
                            Keluar ke Tim
                          </span>
                        )}
                        {isReturn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <ArrowDownToLine className="h-3 w-3" />
                            Kembali ke Gudang
                          </span>
                        )}
                        {!isStockOut && !isReturn && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {trx.type}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {trx.techName || trx.teamName || '-'}
                      </td>
                      <td className="px-4 py-3 font-bold text-purple-700">
                        {trx.itemName}
                        {trx.categoryType && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            {trx.categoryType}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded ${
                          isReturn ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'
                        }`}>
                          {isReturn ? '+' : '-'}{trx.quantity} {trx.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {trx.stockBefore} → <span className="font-bold text-slate-800">{trx.stockAfter}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {trx.performedBy || 'Sistem'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={`${trx.purpose || ''} - ${trx.notes || ''}`}>
                        <div className="font-medium text-slate-800 truncate">{trx.purpose || '-'}</div>
                        {trx.notes && (
                          <div className="text-[10px] text-slate-400 italic truncate">{trx.notes}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {teamTransactions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      Tidak ada rekaman transaksi mutasi material tim yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL / LOG AKTIVITAS TIM */}
        {activeTab === 'audit_logs' && (
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riwayat Aktivitas & Perubahan Material Tim
                </span>
                <span className="text-[10px] text-purple-700 font-mono font-medium bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  Zona Waktu: Asia/Jakarta (WIB)
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {teamAuditLogs.length} total rekaman
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {teamAuditLogs.map(log => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px] border border-purple-200">
                        {log.action}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                        {log.entity} #{log.entityId}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{log.details}</p>
                  </div>
                  <div className="text-right sm:self-center shrink-0">
                    <span className="text-slate-600 block text-[11px] font-semibold">
                      Oleh: {log.userName} ({log.role})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                      {formatDateTimeWIB(log.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              {teamAuditLogs.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  Belum ada catatan aktivitas khusus tim.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Pengembalian Sisa Material ke Gudang</h3>
              </div>
              <button
                onClick={() => setReturnModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                <div><strong>Barang:</strong> {returnModal.itemName}</div>
                <div><strong>Dari Tim / Teknisi:</strong> {returnModal.techName}</div>
                <div><strong>Sisa di Tim:</strong> {returnModal.maxQty} {returnModal.unit}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah yang Dikembalikan ({returnModal.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={returnModal.maxQty}
                  value={returnQty}
                  onChange={e => setReturnQty(Math.min(returnModal.maxQty, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500">
                  <span>Maksimal: {returnModal.maxQty} {returnModal.unit}</span>
                  <button
                    type="button"
                    onClick={() => setReturnQty(returnModal.maxQty)}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Kembalikan Semua ({returnModal.maxQty})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Pengembalian
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sisa pekerjaan cluster Melati, kondisi baik."
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessReturn}
                  disabled={returnQty <= 0 || returnQty > returnModal.maxQty}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Simpan & Masukkan ke Stok Gudang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tandai Habis Modal (Tanpa input Nama Pelanggan) */}
      {depleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-red-50 px-5 py-3.5 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-100 text-red-700 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-red-950 text-sm">Tandai Material Habis</h3>
                  <p className="text-[10px] text-red-700">Konfirmasi material telah tuntas digunakan oleh tim</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepleteModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeplete} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{depleteModal.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tim / Teknisi:</span>
                  <span className="font-bold text-slate-900">{depleteModal.techName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah:</span>
                  <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {depleteModal.quantity} {depleteModal.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan catatan pemakaian jika ada (opsional)..."
                  value={depleteNotes}
                  onChange={e => setDepleteNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDepleteModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ya, Tandai Habis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMaterialsView;
