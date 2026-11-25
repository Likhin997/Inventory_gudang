import React, { useState } from 'react';
import {
  Boxes,
  Radio,
  Cable,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';

interface DashboardViewProps {
  onNavigateTab: (tabId: string) => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenStockIn,
  onOpenStockOut,
  onOpenScanner
}) => {
  const service = InventoryService.getInstance();
  const items = service.items;
  const modemSNs = service.modemSNs;
  const cableUsages = service.cableUsages;
  const transactions = service.transactions;

  const [snSearch, setSnSearch] = useState('');
  const [filterModel, setFilterModel] = useState<string>('ALL');

  // Inventory Totals
  const totalItemCount = items.length;
  const totalModemsCount = modemSNs.length;
  const availableModems = modemSNs.filter(s => s.status === 'AVAILABLE').length;
  const installedModems = modemSNs.filter(s => s.status === 'TERPASANG').length;
  const borrowedModems = modemSNs.filter(s => s.status === 'DIPINJAM_TEKNISI').length;
  const brokenModems = modemSNs.filter(s => s.status === 'RUSAK').length;
  const lostModems = modemSNs.filter(s => s.status === 'HILANG').length;

  const totalCableMeters = items
    .filter(i => i.categoryType === 'KABEL')
    .reduce((acc, curr) => acc + curr.currentStock, 0);

  const totalCableUsedThisMonth = cableUsages.reduce((acc, curr) => acc + curr.metersUsed, 0);

  const generalItemsCount = items
    .filter(i => i.categoryType === 'BARANG_UMUM' || i.categoryType === 'BARANG_TEKNISI')
    .reduce((acc, curr) => acc + curr.currentStock, 0);

  // Month transactions count
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const stockInThisMonth = transactions
    .filter(t => t.type === 'STOCK_IN' && t.date.startsWith(currentMonthPrefix))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const stockOutThisMonth = transactions
    .filter(t => t.type === 'STOCK_OUT' && t.date.startsWith(currentMonthPrefix))
    .reduce((acc, curr) => acc + curr.quantity, 0);

  // Low Stock Items
  const lowStockItems = items.filter(i => i.currentStock <= i.minimumStock);

  // Cable usage grouped by team
  const cableByTech: Record<string, number> = {};
  cableUsages.forEach(cu => {
    cableByTech[cu.techName] = (cableByTech[cu.techName] || 0) + cu.metersUsed;
  });

  // Filtered Modem SNs for real-time table
  const filteredModemSNs = modemSNs.filter(s => {
    const searchLower = (snSearch || '').toLowerCase();
    const matchSearch =
      (s.serialNumber || '').toLowerCase().includes(searchLower) ||
      (s.macAddress || '').toLowerCase().includes(searchLower) ||
      (s.itemName || '').toLowerCase().includes(searchLower);
    const matchModel = filterModel === 'ALL' || s.itemId === filterModel;
    return matchSearch && matchModel;
  });

  // Unique modem items for dropdown filter
  const modemItemOptions = items.filter(i => (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE'));

  return (
    <div className="space-y-6">
      {/* 4-Column Stat Metric Cards (High Density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Modems */}
        <div
          onClick={() => onNavigateTab('modems')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Available Modems (Ready)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {availableModems}{' '}
              <span className="text-xs font-normal text-slate-400">/ {totalModemsCount} units</span>
            </div>
            <div className="text-xs text-green-600 font-medium">
              {totalModemsCount > 0 ? Math.round((availableModems / totalModemsCount) * 100) : 0}% ready
            </div>
          </div>
        </div>

        {/* Card 2: Cable Stock */}
        <div
          onClick={() => onNavigateTab('cables')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Cable Stock (FO / Dropcore)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">
              { (totalCableMeters ?? 0).toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-400">meters</span>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              {cableUsages.length} Transaksi Log
            </div>
          </div>
        </div>

        {/* Card 3: Technician Loans */}
        <div
          onClick={() => onNavigateTab('teams')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-blue-400 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Technician Loans (SN Di Lapangan)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {borrowedModems}{' '}
              <span className="text-xs font-normal text-slate-400">modem</span>
            </div>
            <div className="text-xs text-amber-600 font-medium">{installedModems} Terpasang</div>
          </div>
        </div>

        {/* Card 4: Critical Alerts */}
        <div
          onClick={() => onNavigateTab('low-stock')}
          className="bg-white p-4 border-l-4 border-l-red-500 border border-slate-200 rounded-lg shadow-xs hover:bg-red-50/30 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-red-600 uppercase font-bold mb-1">Critical Alerts (Low Stock)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {String(lowStockItems.length).padStart(2, '0')}{' '}
              <span className="text-xs font-normal text-slate-400">items</span>
            </div>
            <div className="text-xs text-red-700 font-bold underline cursor-pointer">Review Now →</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Real-time Table + Right Rail Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Inventory Tracking (Modem & ONT) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Real-time Inventory Tracking (Modem & ONT)</h2>
              <p className="text-[11px] text-slate-500">Daftar Serial Number aktif dan alokasi tim teknisi</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  value={snSearch}
                  onChange={e => setSnSearch(e.target.value)}
                  placeholder="Search SN / MAC / Model..."
                  className="text-xs border border-slate-200 px-3 py-1.5 rounded w-48 outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 placeholder-slate-400"
                />
              </div>
              <select
                value={filterModel}
                onChange={e => setFilterModel(e.target.value)}
                className="text-xs bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Semua Model</option>
                {modemItemOptions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    Serial Number
                  </th>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    Model
                  </th>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    MAC Address
                  </th>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    Status
                  </th>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                    Team Assigned
                  </th>
                  <th className="p-3 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModemSNs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Tidak ada Serial Number modem yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredModemSNs.slice(0, 6).map(sn => {
                    const statusBadge =
                      sn.status === 'AVAILABLE' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                          AVAILABLE
                        </span>
                      ) : sn.status === 'TERPASANG' ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                          TERPASANG
                        </span>
                      ) : sn.status === 'DIPINJAM_TEKNISI' ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          TECHNICIAN LOAN
                        </span>
                      ) : sn.status === 'DIPINJAM_PINANG' ? (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 border border-teal-300 rounded-full text-[10px] font-bold">
                          DI PINJAM PINANG
                        </span>
                      ) : sn.status === 'RUSAK' ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                          DAMAGED / RMA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {sn.status}
                        </span>
                      );

                    return (
                      <tr key={sn.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="p-3 font-mono font-semibold text-slate-900">{sn.serialNumber}</td>
                        <td className="p-3 text-slate-700 font-medium">{sn.itemName}</td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{sn.macAddress || '-'}</td>
                        <td className="p-3">{statusBadge}</td>
                        <td className="p-3 text-slate-600">
                          {sn.assignedTechName ? (
                            <span className="font-medium text-slate-800">{sn.assignedTechName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Logistics HQ</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onNavigateTab('modems')}
                            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer text-xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-medium">
            <div>
              Showing {Math.min(filteredModemSNs.length, 6)} of {modemSNs.length} SN recorded
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => onNavigateTab('modems')}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700"
              >
                Lihat Semua ({modemSNs.length}) →
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Quick Usage Summary */}
        <div className="flex flex-col space-y-4">
          {/* Low Stock Alerts Box */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 text-sm flex items-center">
                <span className="mr-2">📉</span> Low Stock Alerts
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                {lowStockItems.length} Alert
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-60">
              {lowStockItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                  Semua stok barang dalam kondisi aman.
                </div>
              ) : (
                lowStockItems.slice(0, 3).map(item => {
                  const isCritical = item.currentStock <= 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 border-l-4 rounded-r flex items-center justify-between ${
                        isCritical
                          ? 'bg-red-50 border-l-red-500'
                          : 'bg-amber-50 border-l-amber-500'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{item.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Threshold: {item.minimumStock} {item.unit} | Current:{' '}
                          <span className={isCritical ? 'text-red-600 font-bold' : 'text-amber-700 font-bold'}>
                            {item.currentStock} {item.unit}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={onOpenStockIn}
                        className={`text-[10px] font-bold bg-white px-2 py-1 rounded uppercase border ${
                          isCritical
                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                            : 'border-amber-500 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        Restock
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Usage Summary Progress Box */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4 flex flex-col">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Quick Usage Summary</h2>
            <div className="flex-1 flex flex-col justify-center space-y-3.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">Pemakaian Kabel Bulan Ini</span>
                  <span className="text-blue-600">{ (totalCableUsedThisMonth ?? 0).toLocaleString('id-ID')}m</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((totalCableUsedThisMonth / (totalCableMeters || 1)) * 100)
                      )}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">Modem Terpasang di Lapangan</span>
                  <span className="text-purple-600">{installedModems} units</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((installedModems / (totalModemsCount || 1)) * 100)
                      )}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">Modem Ready di Gudang (HQ)</span>
                  <span className="text-green-600">{availableModems} units</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((availableModems / (totalModemsCount || 1)) * 100)
                      )}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Download Full Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity / Stock Movement Stream */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Aktivitas Transaksi Gudang Terakhir</h3>
          </div>
          <button
            onClick={() => onNavigateTab('reports-movement')}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Lihat Semua Histori →
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden">
          {transactions.slice(0, 5).map(trx => {
            const isStockIn = trx.type === 'STOCK_IN';
            return (
              <div key={trx.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-1.5 rounded ${
                      isStockIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isStockIn ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{trx.itemName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isStockIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isStockIn ? '+ MASUK' : '- KELUAR'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isStockIn
                        ? `Supplier: ${trx.supplierName || 'N/A'}`
                        : `Teknisi: ${trx.techName || 'N/A'}`}
                      {trx.project ? ` • Proyek: ${trx.project}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:self-center">
                  <p className="font-mono font-bold text-xs text-slate-900">
                    {isStockIn ? '+' : '-'}
                    {trx.quantity} {trx.unit}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {trx.date} • {trx.performedBy}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

