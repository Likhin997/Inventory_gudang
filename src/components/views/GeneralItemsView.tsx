import React, { useState } from 'react';
import {
  Package,
  Wrench,
  Search,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sliders,
  AlertTriangle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item } from '../../types/inventory';
import { exportToExcel, exportPDFTable } from '../../utils/exportUtils';

interface GeneralItemsViewProps {
  onOpenStockInItem?: (item: Item) => void;
  onOpenStockOutItem?: (item: Item) => void;
}

export const GeneralItemsView: React.FC<GeneralItemsViewProps> = ({
  onOpenStockInItem,
  onOpenStockOutItem
}) => {
  const service = InventoryService.getInstance();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryType, setCategoryType] = useState<string>('ALL');

  // Quick Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const generalItems = service.items.filter(i => {
    const generalCategories = ['BARANG_UMUM', 'AKSESORIS', 'PASIF', 'QUANTITY'];
    const isTargetCategory =
      categoryType === 'ALL'
        ? (generalCategories.includes(i.categoryType) || i.categoryType === 'BARANG_TEKNISI')
        : categoryType === 'BARANG_UMUM'
        ? generalCategories.includes(i.categoryType)
        : i.categoryType === categoryType;

    const searchLower = (searchTerm || '').toLowerCase();
    const matchSearch =
      (i.name || '').toLowerCase().includes(searchLower) ||
      (i.code || '').toLowerCase().includes(searchLower) ||
      (i.brand || '').toLowerCase().includes(searchLower);

    return isTargetCategory && matchSearch;
  });

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    try {
      service.performStockAdjustment({
        itemId: adjustItem.id,
        newStock: adjustQty,
        reason: adjustReason || 'Penyesuaian Fisik Gudang'
      });
      setAdjustItem(null);
      setAdjustReason('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportExcel = () => {
    const data = generalItems.map((item, idx) => ({
      No: idx + 1,
      Kode: item.code,
      'Nama Barang': item.name,
      Kategori: item.categoryType === 'BARANG_TEKNISI' ? 'Perlengkapan Teknisi' : 'Barang Umum/Aksesoris',
      Merk: item.brand,
      Model: item.model,
      'Stok Saat Ini': item.currentStock,
      Satuan: item.unit,
      'Batas Min': item.minimumStock,
      Lokasi: item.location,
      'Harga Satuan (Rp)': item.defaultPrice
    }));

    exportToExcel(`Barang_Umum_Aksesoris_${new Date().toISOString().slice(0, 10)}`, [
      { sheetName: 'Barang Umum', data }
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Barang Umum, Aksesoris FTTH & Perlengkapan Teknisi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen stok kuantitas untuk Fast Connector, Patchcord, Adaptor, ODP, Splicer, dan toolkit lapangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCategoryType('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              categoryType === 'ALL'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            Semua ({service.items.filter(i => ['BARANG_UMUM', 'AKSESORIS', 'PASIF', 'QUANTITY', 'BARANG_TEKNISI'].includes(i.categoryType)).length})
          </button>
          <button
            onClick={() => setCategoryType('BARANG_UMUM')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              categoryType === 'BARANG_UMUM'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            Aksesoris & Pasif FTTH
          </button>
          <button
            onClick={() => setCategoryType('BARANG_TEKNISI')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              categoryType === 'BARANG_TEKNISI'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            Tools & Perlengkapan Teknisi
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aksesoris, konektor, adaptor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {generalItems.map(item => {
          const isLow = item.currentStock <= item.minimumStock;
          const isTools = item.categoryType === 'BARANG_TEKNISI';

          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-blue-700 font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {item.code}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{item.name}</h3>
                    <p className="text-xs text-slate-500">{item.brand} • {item.model}</p>
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      isTools ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isTools ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  </div>
                </div>

                <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Stok Fisik</span>
                    <span className={`text-xl font-bold font-mono ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                      { (item.currentStock ?? 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Batas Min.</span>
                    <span className="text-xs font-mono text-slate-600">
                      {item.minimumStock} {item.unit}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || `Lokasi: ${item.location}`}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">{item.location}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setAdjustItem(item);
                      setAdjustQty(item.currentStock);
                    }}
                    className="p-1.5 rounded bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Penyesuaian Cepat (Stock Opname)"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                  </button>
                  {onOpenStockInItem && (
                    <button
                      onClick={() => onOpenStockInItem(item)}
                      className="px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 text-[11px] font-semibold transition-colors"
                    >
                      + Masuk
                    </button>
                  )}
                  {onOpenStockOutItem && (
                    <button
                      onClick={() => onOpenStockOutItem(item)}
                      className="px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-semibold transition-colors"
                    >
                      - Keluar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADJUSTMENT MODAL */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Penyesuaian Stok Fisik (Adjustment)</h3>
                <p className="text-xs text-blue-600">{adjustItem.name}</p>
              </div>
              <button onClick={() => setAdjustItem(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Stok Sistem Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900">{adjustItem.currentStock} {adjustItem.unit}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Hasil Hitung Fisik Sebenarnya ({adjustItem.unit}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Alasan Penyesuaian / Selisih</label>
                <textarea
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="misal: Hasil stock opname berkala, selisih pecah/rusak..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

