import React, { useState } from 'react';
import {
  Cable,
  TrendingUp,
  Plus,
  ArrowUpFromLine,
  Search,
  Filter,
  Users,
  FileSpreadsheet,
  FileText,
  Building2,
  Calendar,
  AlertCircle, X, RotateCcw
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, CableUsageLog } from '../../types/inventory';
import { exportToExcel, exportPDFTable } from '../../utils/exportUtils';

interface CableManagementViewProps {
  onOpenCableIn?: (item?: Item) => void;
  onOpenCableOut?: (item?: Item) => void;
}

export const CableManagementView: React.FC<CableManagementViewProps> = ({
  onOpenCableIn,
  onOpenCableOut
}) => {
  const service = InventoryService.getInstance();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [returnModal, setReturnModal] = useState<{ logId: string, itemName: string, maxQty: number } | null>(null);
  const [returnQty, setReturnQty] = useState<number>(0);
  const [tick, setTick] = useState(0);

  React.useEffect(() => {
    return service.subscribe(() => {
      setTick(t => t + 1);
    });
  }, [service]);

  const [emptyModal, setEmptyModal] = useState<{logId: string, itemName: string} | null>(null);
  const [emptyCustomerName, setEmptyCustomerName] = useState('');
  const [emptyCustomerError, setEmptyCustomerError] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenEmptyModal = (logId: string, itemName: string) => {
    setEmptyModal({ logId, itemName });
    setEmptyCustomerName('');
    setEmptyCustomerError('');
  };

  const handleMarkEmpty = () => {
    if (!emptyModal) return;
    const trimmed = emptyCustomerName.trim();
    if (!trimmed) {
      setEmptyCustomerError('Nama pelanggan wajib diisi.');
      return;
    }

    try {
      const log = service.cableUsages.find(m => m.id === emptyModal.logId);
      if (log) {
        log.isFinished = true;
        log.customerName = trimmed;
        const psbNote = `Note Psb An "${trimmed}"`;
        log.notes = log.notes ? `${log.notes} | ${psbNote}` : psbNote;
        log.purpose = log.purpose ? `${log.purpose} (${psbNote})` : psbNote;
        
        service.logAudit(
          'CABLE_HABIS',
          'CABLE',
          log.id,
          `Kabel ${log.itemName} ditandai habis - ${psbNote}`
        );

        service.persistAll();
        showToast(`✅ Stok kabel berhasil ditandai habis (${psbNote}).`);
        setEmptyModal(null);
        setEmptyCustomerName('');
        setEmptyCustomerError('');
      } else {
        showToast('❌ Gagal: Log tidak ditemukan.', 'error');
      }
    } catch (err: any) {
      showToast(`❌ Gagal: ${err.message}`, 'error');
    }
  };
  const handleProcessReturn = async () => {
    if (!returnModal || returnQty <= 0 || returnQty > returnModal.maxQty) return;
    
    const log = service.cableUsages.find(m => m.id === returnModal.logId);
    if (!log) return;
    
    const item = service.items.find(i => i.id === log.itemId);
    
    log.metersUsed -= returnQty;
    
    if (item) {
      const stockBefore = item.currentStock;
      item.currentStock += returnQty;
      const stockAfter = item.currentStock;
      item.updatedAt = new Date().toISOString();
      
      service.transactions.push({
        id: 'trx-' + Date.now() + Math.floor(Math.random()*1000),
        transactionNumber: 'RTN-' + Date.now(),
        type: 'RETURN',
        date: new Date().toISOString(),
        itemId: item.id,
        itemName: item.name,
        categoryType: item.categoryType,
        quantity: returnQty,
        unit: 'Meter',
        techId: log.techId,
        techName: log.techName,
        project: log.project,
        notes: `Pengembalian kabel sisa dari log pemakaian ${log.date}`,
        performedBy: service.currentUser?.name || 'Sistem',
        stockBefore: stockBefore,
        stockAfter: stockAfter,
        status: 'COMPLETED'
      });
    }
    
    service.persistAll();
    setReturnModal(null);
    setReturnQty(0);
  };

  const cableItems = service.items.filter(i => i.categoryType === 'KABEL');
  const totalMeters = cableItems.reduce((acc, curr) => acc + curr.currentStock, 0);

  const teamOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    (service.teams || []).forEach(t => {
      if (t.id && t.name) map.set(t.id, t.name);
    });
    (service.cableUsages || []).forEach(u => {
      if (u.teamId && u.teamName) {
        map.set(u.teamId, u.teamName);
      } else if (u.techId && u.techName) {
        map.set(u.techId, u.techName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [service.teams, service.cableUsages, tick]);

  const filteredLogs = React.useMemo(() => {
    return service.cableUsages.filter(log => {
      // 1. Team filter
      if (selectedTeam !== 'ALL') {
        const matchesTeam =
          log.teamId === selectedTeam ||
          log.techId === selectedTeam ||
          log.teamName === selectedTeam ||
          log.techName === selectedTeam;
        if (!matchesTeam) return false;
      }

      // 2. Date filter (YYYY-MM-DD)
      const logDate = (log.date || '').slice(0, 10);
      if (startDate && logDate < startDate) {
        return false;
      }
      if (endDate && logDate > endDate) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        const matchesSearch =
          (log.itemName || '').toLowerCase().includes(searchLower) ||
          (log.techName || '').toLowerCase().includes(searchLower) ||
          (log.teamName || '').toLowerCase().includes(searchLower) ||
          (log.customerName || '').toLowerCase().includes(searchLower) ||
          (log.project || '').toLowerCase().includes(searchLower) ||
          (log.notes || '').toLowerCase().includes(searchLower) ||
          (log.purpose || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [service.cableUsages, selectedTeam, startDate, endDate, searchTerm, tick]);

  const totalUsedFiltered = filteredLogs.reduce((acc, curr) => acc + curr.metersUsed, 0);

  // Group by team for visual charts
  const techUsageAgg: Record<string, number> = {};
  service.cableUsages.forEach(u => {
    techUsageAgg[u.techName] = (techUsageAgg[u.techName] || 0) + u.metersUsed;
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map((l, idx) => ({
      No: idx + 1,
      Tanggal: l.date,
      'Jenis Kabel': l.itemName,
      'Team Bertugas': l.techName,
      'Teknisi PIC': l.techName,
      'Pemakaian (Meter)': l.metersUsed,
      'Proyek / Cluster': l.project,
      'Nama Pelanggan': l.customerName || '-',
      Keterangan: l.purpose,
      'Catatan Riwayat': l.notes || '-',
      Status: l.isFinished ? 'Sudah Habis' : 'Aktif',
      'Dicatat Oleh': l.performedBy
    }));

    exportToExcel(`Laporan_Pemakaian_Kabel_${new Date().toISOString().slice(0, 10)}`, [
      { sheetName: 'Log Kabel', data }
    ]);
  };

  const handleExportPDF = () => {
    const headers = ['Tgl', 'Jenis Kabel', 'Team', 'Teknisi', 'Meter', 'Proyek', 'Keterangan'];
    const rows = filteredLogs.map(l => [
      l.date,
      l.itemName,
      l.techName,
      l.techName,
      `${l.metersUsed} m`,
      l.project,
      l.notes ? `${l.purpose || ''} [${l.notes}]` : (l.purpose || '-')
    ]);

    exportPDFTable({
      title: 'Laporan Pemakaian Kabel Fiber Optik & UTP',
      subtitle: `Total Pemakaian Terfilter: ${ (totalUsedFiltered ?? 0).toLocaleString('id-ID')} Meter`,
      filename: `Laporan_Kabel_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cable className="h-5 w-5 text-blue-600" />
            <span>Manajemen Kabel Optik & UTP (Meter-Based)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan stok kabel berbasis meteran, pencatatan pemakaian per team teknisi, dan proyek FTTH.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCableIn && (
            <button
              onClick={() => onOpenCableIn()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Kabel Masuk (Meter)</span>
            </button>
          )}

          {onOpenCableOut && (
            <button
              onClick={() => onOpenCableOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              <span>- Pakai Kabel (Team)</span>
            </button>
          )}
        </div>
      </div>

      {/* Cable Rolls Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cableItems.map(item => {
          const isLow = item.currentStock <= item.minimumStock;
          const usageCount = service.cableUsages
            .filter(u => u.itemId === item.id)
            .reduce((acc, curr) => acc + curr.metersUsed, 0);

          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-blue-700 font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                    {item.code}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.brand} • {item.model}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 text-green-700">
                  <Cable className="h-4 w-4" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Stok Tersedia</span>
                  <span className={`text-xl font-bold font-mono ${isLow ? 'text-amber-700' : 'text-green-700'}`}>
                    { (item.currentStock ?? 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">m</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Terpakai</span>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    { (usageCount ?? 0).toLocaleString('id-ID')} m
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500 mt-2">
                <span>Lokasi: {item.location}</span>
                <div className="flex items-center gap-3">
                  {onOpenCableIn && (
                    <button
                      onClick={() => onOpenCableIn(item)}
                      className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Meter
                    </button>
                  )}
                  {onOpenCableOut && (
                    <button
                      onClick={() => onOpenCableOut(item)}
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" /> Pakai Meter
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cable Team Usage Analytics & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Summary per Team */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Akumulasi Pemakaian per Team</span>
            </h3>
          </div>

          <div className="space-y-2.5">
            {Object.entries(techUsageAgg).map(([techName, meters]) => {
              const maxVal = Math.max(...Object.values(techUsageAgg), 1);
              const percentage = Math.round((meters / maxVal) * 100);

              return (
                <div key={techName} className="p-2.5 rounded bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-900">{techName}</span>
                    <span className="font-mono font-bold text-green-700">{ (meters ?? 0).toLocaleString('id-ID')} m</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded bg-blue-50 border border-blue-100 text-xs text-blue-900">
            <p className="font-semibold">💡 Catatan ISP:</p>
            <p className="text-[11px] text-blue-800 mt-0.5">
              Setiap pengeluaran kabel langsung memotong stok utama secara real-time dan tercatat pada histori teknisi.
            </p>
          </div>
        </div>

        {/* Right: Detailed Logs Table */}
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          {/* Header & Export Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">Log Riwayat Pemakaian Kabel</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">
                {filteredLogs.length} Entri
              </span>
              {(selectedTeam !== 'ALL' || startDate || endDate || searchTerm) && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200">
                  Filter Aktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold transition-colors"
                title="Ekspor ke Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors"
                title="Ekspor ke PDF"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Controls: Team & Tanggal */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              {/* Filter Team */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span>Filter Team / Teknisi</span>
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="ALL">Semua Team & Teknisi</option>
                  {teamOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tanggal */}
              <div className="lg:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Filter Rentang Tanggal</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700"
                    title="Dari Tanggal"
                  />
                  <span className="text-xs text-slate-400 font-medium">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700"
                    title="Sampai Tanggal"
                  />
                </div>
              </div>

              {/* Quick Search & Reset */}
              <div className="lg:col-span-3 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(selectedTeam !== 'ALL' || startDate || endDate || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedTeam('ALL');
                      setStartDate('');
                      setEndDate('');
                      setSearchTerm('');
                    }}
                    className="px-2 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                    title="Reset semua filter"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setStartDate(today);
                  setEndDate(today);
                }}
                className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
                  startDate === new Date().toISOString().slice(0, 10) && endDate === new Date().toISOString().slice(0, 10)
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setStartDate(firstDay);
                  setEndDate(lastDay);
                }}
                className="px-2 py-0.5 rounded border text-[11px] bg-white text-slate-600 border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Bulan Ini
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-0.5 rounded border text-[11px] bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                >
                  Hapus Rentang Tanggal
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Tanggal</th>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Jenis Kabel</th>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Pemakaian</th>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Team / Teknisi</th>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Proyek & Keterangan</th>
                  <th className="py-2 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Belum ada log pemakaian kabel yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50/60 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-600">{log.date}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{log.itemName}</td>
                      <td className="py-2 px-3 font-mono font-bold text-green-700">
                        { (log.metersUsed ?? 0).toLocaleString('id-ID')} m
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] text-slate-500">{log.techName}</span>
                        <p className="font-semibold text-slate-900">{log.techName}</p>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-blue-700">{log.project || '-'}</p>
                          {log.isFinished && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              Sudah Habis
                            </span>
                          )}
                        </div>
                        {log.purpose && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{log.purpose}</p>
                        )}
                        {log.notes && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            <span>📝 {log.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          {log.metersUsed > 0 && (
                            <>
                              {(!log.isFinished) && (
                                <button
                                  onClick={() => {
                                    setReturnModal({ logId: log.id, itemName: log.itemName, maxQty: log.metersUsed });
                                    setReturnQty(log.metersUsed);
                                  }}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[11px] font-bold transition-colors"
                                >
                                  Kembalikan
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEmptyModal(log.id, log.itemName)}
                                disabled={log.isFinished}
                                className={`px-2 py-1 border rounded text-[11px] font-bold transition-colors ${
                                  log.isFinished 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                                }`}
                              >
                                {log.isFinished ? 'Sudah Habis' : 'Tandai Habis'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Kembalikan Kabel</h3>
              <button 
                onClick={() => setReturnModal(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                Mengembalikan <span className="font-bold">{returnModal.itemName}</span>.
                <br/>Panjang maksimal yang bisa dikembalikan: <span className="font-bold">{returnModal.maxQty} Meter</span>.
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Panjang yang Dikembalikan (Meter)
                </label>
                <input
                  type="number"
                  min="0"
                  max={returnModal.maxQty}
                  step="0.01"
                  value={returnQty || ''}
                  onChange={e => setReturnQty(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setReturnModal(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleProcessReturn}
                disabled={returnQty <= 0 || returnQty > returnModal.maxQty}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                Proses Pengembalian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tandai Habis Modal */}
      {emptyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span>Tandai Kabel Habis</span>
              </h3>
              <button 
                onClick={() => setEmptyModal(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleMarkEmpty(); }}>
              <div className="p-4 space-y-4">
                <p className="text-sm text-slate-700">
                  Apakah Anda yakin ingin menandai kabel <span className="font-bold text-slate-900">{emptyModal.itemName}</span> di tangan teknisi ini menjadi habis?
                </p>

                {/* Input Nama Pelanggan (Wajib Diisi) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nama Pelanggan <span className="text-red-500">* (Wajib diisi)</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={emptyCustomerName}
                    onChange={(e) => {
                      setEmptyCustomerName(e.target.value);
                      if (emptyCustomerError && e.target.value.trim()) {
                        setEmptyCustomerError('');
                      }
                    }}
                    placeholder="Masukkan nama pelanggan (contoh: Pak Hendra / Ibu Ratna)..."
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${
                      emptyCustomerError
                        ? 'border-red-400 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {emptyCustomerError ? (
                    <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                      <span>⚠️ {emptyCustomerError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Catatan di log riwayat:{' '}
                      <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        Note Psb An &quot;{emptyCustomerName.trim() || '...'}&quot;
                      </span>
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-xs leading-relaxed">
                  <AlertCircle className="h-4 w-4 inline-block mr-1.5 mb-0.5 text-amber-600 shrink-0" />
                  Ini TIDAK akan mengembalikan stok ke gudang, hanya menandai sisa kabel sebagai habis di catatan pemakaian dengan keterangan pelanggan terkait.
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmptyModal(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!emptyCustomerName.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ya, Tandai Habis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

