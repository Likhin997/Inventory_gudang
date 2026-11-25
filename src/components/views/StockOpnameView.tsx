import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Clock,
  User,
  Sliders
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { StockOpname, StockOpnameItem } from '../../types/inventory';
import { exportToExcel, exportPDFTable } from '../../utils/exportUtils';

export const StockOpnameView: React.FC = () => {
  const service = InventoryService.getInstance();
  const [showNewOpnameModal, setShowNewOpnameModal] = useState(false);
  const [opnameNotes, setOpnameNotes] = useState('Stock Opname Rutin Akhir Bulan');
  const [opnameCategoryFilter, setOpnameCategoryFilter] = useState('ALL');

  // Working Opname Items state
  const [opnameItems, setOpnameItems] = useState<StockOpnameItem[]>([]);

  const handleStartNewOpname = () => {
    const list = service.items
      .filter(i => opnameCategoryFilter === 'ALL' || i.categoryType === opnameCategoryFilter)
      .map(item => ({
        id: `opd-${item.id}-${Date.now()}`,
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        categoryType: item.categoryType,
        unit: item.unit,
        systemStock: item.currentStock,
        physicalStock: item.currentStock,
        difference: 0,
        notes: ''
      }));

    setOpnameItems(list);
    setShowNewOpnameModal(true);
  };

  const handlePhysicalStockChange = (idx: number, newPhysical: number) => {
    const next = [...opnameItems];
    const diff = newPhysical - next[idx].systemStock;
    next[idx].physicalStock = newPhysical;
    next[idx].difference = diff;
    setOpnameItems(next);
  };

  const handleSaveOpname = (autoApplyAdjustments: boolean) => {
    try {
      const opname = service.createStockOpname({
        notes: opnameNotes,
        items: opnameItems,
        autoAdjust: autoApplyAdjustments
      });

      alert(`✅ Stock Opname berhasil disimpan! ${autoApplyAdjustments ? 'Stok sistem telah disesuaikan otomatis.' : ''}`);
      setShowNewOpnameModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportOpnameExcel = (opname: StockOpname) => {
    const data = opname.items.map((item, idx) => ({
      No: idx + 1,
      'Kode Barang': item.itemCode,
      'Nama Barang': item.itemName,
      'Stok Sistem': item.systemStock,
      'Stok Fisik': item.physicalStock,
      Selisih: item.difference,
      Keterangan: item.notes || '-'
    }));

    exportToExcel(`Stock_Opname_${opname.opnameNumber}`, [
      { sheetName: 'Hasil Opname', data }
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span>Stock Opname & Audit Fisik Gudang</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencocokan stok fisik riil dengan catatan sistem, deteksi selisih otomatis, dan sinkronisasi saldo inventaris.
          </p>
        </div>

        <button
          onClick={handleStartNewOpname}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Mulai Stock Opname Baru</span>
        </button>
      </div>

      {/* History of Past Stock Opnames */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Riwayat Sesi Stock Opname</h3>

        {(service.stockOpnames || []).map(opname => (
          <div
            key={opname.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {opname.opnameNumber}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{opname.notes || 'Stock Opname Berkala'}</h4>
                  <p className="text-xs text-slate-500">
                    Pelaksana: <strong className="text-slate-800">{opname.performedBy}</strong> • Tanggal: {opname.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportOpnameExcel(opname)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold border border-green-200 hover:bg-green-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* Opname Items Summary Table */}
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-3">Kode</th>
                    <th className="py-2 px-3">Nama Barang</th>
                    <th className="py-2 px-3">Stok Sistem</th>
                    <th className="py-2 px-3">Stok Fisik</th>
                    <th className="py-2 px-3">Selisih</th>
                    <th className="py-2 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(opname.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-blue-700 font-bold">{item.itemCode}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{item.itemName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{item.systemStock}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.physicalStock}</td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {item.difference === 0 ? (
                          <span className="text-green-700">0 (Cocok)</span>
                        ) : item.difference > 0 ? (
                          <span className="text-blue-700">+{item.difference} (Lebih)</span>
                        ) : (
                          <span className="text-red-700">{item.difference} (Kurang)</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* NEW OPNAME WIZARD MODAL */}
      {showNewOpnameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span>Lembar Hitung Fisik Stock Opname</span>
                </h3>
                <p className="text-xs text-slate-500">Masukkan hasil hitungan fisik riil di gudang.</p>
              </div>
              <button onClick={() => setShowNewOpnameModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1 text-xs">Catatan Sesi Opname</label>
                <input
                  type="text"
                  value={opnameNotes}
                  onChange={e => setOpnameNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Items Entry Table */}
              <div className="rounded border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">SKU & Nama Barang</th>
                      <th className="py-2 px-3">Stok Sistem</th>
                      <th className="py-2 px-3">Hasil Hitung Fisik</th>
                      <th className="py-2 px-3">Selisih</th>
                      <th className="py-2 px-3">Alasan / Catatan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {opnameItems.map((row, idx) => (
                      <tr key={row.itemId} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-900">{row.itemName}</p>
                          <span className="font-mono text-[10px] text-blue-600">{row.itemCode}</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {row.systemStock}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="any"
                            value={row.physicalStock}
                            onChange={e => handlePhysicalStockChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {row.difference === 0 ? (
                            <span className="text-green-700">0 Cocok</span>
                          ) : row.difference > 0 ? (
                            <span className="text-blue-700">+{row.difference}</span>
                          ) : (
                            <span className="text-red-700">{row.difference}</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Alasan jika ada selisih..."
                            value={row.notes}
                            onChange={e => {
                              const next = [...opnameItems];
                              next[idx].notes = e.target.value;
                              setOpnameItems(next);
                            }}
                            className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Pilih opsi simpan dengan atau tanpa update otomatis stok sistem.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveOpname(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Simpan Catatan Saja
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOpname(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Simpan & Sesuaikan Stok Sistem Otomatis</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
