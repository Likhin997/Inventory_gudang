import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Radio,
  Cable,
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  FileText,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, ItemCategoryType } from '../../types/inventory';
import { exportToExcel, exportToCSV, exportPDFTable } from '../../utils/exportUtils';
import { StockTransferModal } from '../modals/StockTransferModal';

interface InventoryAllViewProps {
  initialFilter?: string;
  onStockIn?: (item: Item) => void;
  onStockOut?: (item: Item) => void;
  onOpenStockInItem?: (item: Item) => void;
  onOpenStockOutItem?: (item: Item) => void;
}

export const InventoryAllView: React.FC<InventoryAllViewProps> = ({
  initialFilter,
  onStockIn,
  onStockOut,
  onOpenStockInItem,
  onOpenStockOutItem
}) => {
  const service = InventoryService.getInstance();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(initialFilter === 'low-stock');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceItem, setTransferSourceItem] = useState<Item | null>(null);

  const handleOpenTransfer = (item?: Item) => {
    setTransferSourceItem(item || null);
    setShowTransferModal(true);
  };

  const handleStockIn = onStockIn || onOpenStockInItem;
  const handleStockOut = onStockOut || onOpenStockOutItem;

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    categoryType: 'BARANG_UMUM' as ItemCategoryType,
    brand: '',
    model: '',
    unit: 'pcs',
    currentStock: 0,
    minimumStock: 20,
    location: '',
    defaultPrice: 0,
    description: '',
    isSerialTracked: false
  });

  const filteredItems = service.items.filter(item => {
    const matchSearch =
      (item.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (item.code || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (item.brand || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (item.model || '').toLowerCase().includes((searchTerm || '').toLowerCase());

    const matchCategory =
      selectedCategory === 'ALL' || item.categoryId === selectedCategory;

    const matchLowStock = !onlyLowStock || item.currentStock <= item.minimumStock;

    return matchSearch && matchCategory && matchLowStock;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: `SKU-${Date.now().toString().slice(-4)}`,
      name: '',
      categoryId: service.categories[0]?.id || '',
      categoryType: service.categories[0]?.type || 'BARANG_UMUM',
      brand: '',
      model: '',
      unit: 'pcs',
      currentStock: 0,
      minimumStock: 20,
      location: 'Rak Gudang',
      defaultPrice: 0,
      description: '',
      isSerialTracked: false
    });
    setShowItemModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      categoryId: item.categoryId || '',
      categoryType: item.categoryType,
      brand: item.brand,
      model: item.model,
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      location: item.location,
      defaultPrice: item.defaultPrice,
      description: item.description,
      isSerialTracked: item.isSerialTracked
    });
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert('Kode dan Nama Barang wajib diisi!');
      return;
    }

    if (editingItem) {
      service.updateItem(editingItem.id, {
        ...formData,
        isSerialTracked: (formData.categoryType === 'MODEM' || formData.categoryType === 'DISMANTLE') ? true : formData.isSerialTracked
      });
    } else {
      service.createItem({
        ...formData,
        isSerialTracked: (formData.categoryType === 'MODEM' || formData.categoryType === 'DISMANTLE') ? true : formData.isSerialTracked
      });
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus master barang "${name}"?`)) {
      service.deleteItem(id);
    }
  };

  const handleExportExcel = () => {
    const data = filteredItems.map((item, idx) => ({
      No: idx + 1,
      'Kode Barang': item.code,
      'Nama Barang': item.name,
      Kategori: item.categoryType,
      Merk: item.brand,
      Model: item.model,
      'Stok Saat Ini': item.currentStock,
      Satuan: item.unit,
      'Batas Min. Stok': item.minimumStock,
      Lokasi: item.location,
      'Harga Satuan (Rp)': item.defaultPrice,
      'Serial Number Tracked': item.isSerialTracked ? 'YA' : 'TIDAK'
    }));
    exportToExcel(`Master_Inventory_ISP_${new Date().toISOString().slice(0, 10)}`, [
      { sheetName: 'Inventory', data }
    ]);
  };

  const handleExportCSV = () => {
    const data = filteredItems.map(item => ({
      Code: item.code,
      Name: item.name,
      Category: item.categoryType,
      Brand: item.brand,
      Model: item.model,
      Stock: item.currentStock,
      Unit: item.unit,
      MinStock: item.minimumStock,
      Location: item.location,
      Price: item.defaultPrice
    }));
    exportToCSV(`Master_Inventory_${new Date().toISOString().slice(0, 10)}`, data);
  };

  const handleExportPDF = () => {
    const headers = ['Kode', 'Nama Barang', 'Kategori', 'Stok', 'Min', 'Lokasi', 'Harga (Rp)'];
    const rows = filteredItems.map(item => [
      item.code,
      item.name,
      item.categoryType,
      `${item.currentStock} ${item.unit}`,
      `${item.minimumStock} ${item.unit}`,
      item.location || '-',
      item.defaultPrice ? item.defaultPrice.toLocaleString('id-ID') : '-'
    ]);
    exportPDFTable({
      title: 'Laporan Master Inventory Perusahaan ISP',
      subtitle: `Total SKU: ${filteredItems.length} | Kategori: ${selectedCategory}`,
      filename: `Laporan_Inventory_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-blue-600" />
            <span>Semua Data Inventory ISP</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap master barang, stok berjalan, lokasi gudang, dan batas minimum stok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 shadow-xs">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold"
              title="Export ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold"
              title="Export ke PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium"
              title="Export CSV"
            >
              CSV
            </button>
          </div>

          <button
            onClick={() => handleOpenTransfer()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Pindahkan kuantitas / Serial Number antar master barang"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Pindah / Mutasi Stok</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Master Barang</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-xs">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan SKU, nama barang, merk, atau model..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">Semua Kategori ({service.items.length})</option>
            {service.categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={e => setOnlyLowStock(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Filter Low Stock Saja</span>
          </label>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Kode SKU</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Nama Barang & Spek</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Kategori</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Stok Saat Ini</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Min. Stok</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Lokasi Rak</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Harga Satuan</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-center">Status</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada data barang yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isLow = item.currentStock <= item.minimumStock;
                  const isZero = item.currentStock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        <button 
                          onClick={() => setDetailItem(item)}
                          className="hover:underline text-blue-700 font-bold"
                          title="Lihat Detail Barang"
                        >
                          {item.code}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.brand} • {item.model}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            (item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE')
                              ? 'bg-blue-100 text-blue-700'
                              : item.categoryType === 'KABEL'
                              ? 'bg-green-100 text-green-700'
                              : item.categoryType === 'BARANG_TEKNISI'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {(item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE') && <Radio className="h-3 w-3" />}
                          {item.categoryType === 'KABEL' && <Cable className="h-3 w-3" />}
                          {item.categoryType === 'BARANG_UMUM' && <Package className="h-3 w-3" />}
                          {service.categories.find(c => c.id === item.categoryId)?.name || item.categoryType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isZero
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-green-700'
                          }`}
                        >
                          { (item.currentStock ?? 0).toLocaleString('id-ID')}
                        </span>
                        <span className="text-slate-500 ml-1 text-[11px]">{item.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {item.minimumStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.location || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {item.defaultPrice ? `Rp ${item.defaultPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isZero ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[9px]">
                            HABIS
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                            MENIPIS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold text-[9px]">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {handleStockIn && (
                            <button
                              onClick={() => handleStockIn(item)}
                              className="p-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                              title="Stock In (+)"
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {handleStockOut && (
                            <button
                              onClick={() => handleStockOut(item)}
                              className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                              title="Stock Out (-)"
                            >
                              <ArrowUpFromLine className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenTransfer(item)}
                            className="p-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 cursor-pointer"
                            title="Pindahkan Stok ke Barang Lain"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-slate-200"
                            title="Edit Master Barang"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {service.currentUser.role === 'SUPERADMIN' && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1 rounded bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Hapus Master Barang"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredItems.length} dari {service.items.length} master barang</span>
          <span className="text-[11px] font-mono">CI4-Ready Schema • Atomic Lock Enabled</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-blue-600" />
                <span>{editingItem ? 'Edit Master Barang' : 'Tambah Master Barang Baru'}</span>
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kode SKU Barang *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="misal: ONT-HW-HG8245H"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori Barang *</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => {
                      const catId = e.target.value;
                      const cat = service.categories.find(c => c.id === catId);
                      if (cat) {
                        setFormData({
                          ...formData,
                          categoryId: cat.id,
                          categoryType: cat.type,
                          unit: cat.type === 'KABEL' ? 'm' : (cat.type === 'MODEM' || cat.type === 'DISMANTLE') ? 'unit' : 'pcs'
                        });
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>Pilih Kategori...</option>
                    {service.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap Barang *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="misal: Huawei HG8245H GPON ONT 4GE + Wi-Fi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Merk / Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Huawei / ZTE / Voksel"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Model / Tipe Spesifikasi</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="HG8245H / Dropcore 1 Core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Satuan Unit</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="" disabled>-- Pilih Satuan --</option>
                    {service.units.map(u => (
                      <option key={u.id} value={u.symbol || u.name}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Stok Awal</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.currentStock}
                    onChange={e => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Min Stok</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minimumStock}
                    onChange={e => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 20 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lokasi Rak / Bin Gudang</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="misal: Rak A-01, Bin 2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimasi Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={formData.defaultPrice}
                    onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi & Catatan Teknis</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Keterangan spesifikasi teknis..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Master Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Detail Master Barang</span>
                <h3 className="text-base font-bold text-slate-900 font-mono">{detailItem.code} - {detailItem.name}</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Kategori:</span>
                  <span className="font-semibold text-slate-900">{service.categories.find(c => c.id === detailItem.categoryId)?.name || detailItem.categoryType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Brand & Model:</span>
                  <span className="font-semibold text-slate-900">{detailItem.brand} {detailItem.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Harga Satuan (Estimasi):</span>
                  <span className="font-mono text-slate-800 text-[11px]">{detailItem.defaultPrice != null ? `Rp ${detailItem.defaultPrice.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Lokasi Gudang:</span>
                  <span className="font-semibold text-slate-800">{detailItem.location || '-'}</span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-3 text-xs">
                <div>
                  <span className="text-blue-600 block text-[10px] font-bold">Stok Sistem Saat Ini:</span>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-2xl font-bold font-mono text-slate-900">{ (detailItem.currentStock ?? 0).toLocaleString('id-ID')}</span>
                    <span className="text-slate-600 font-semibold mb-1">{detailItem.unit}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white p-2 rounded border border-blue-100">
                  <span className="text-slate-500 text-[10px] font-bold">Batas Minimum:</span>
                  <span className="font-mono text-slate-800">{detailItem.minimumStock} {detailItem.unit}</span>
                </div>
                {(detailItem.categoryType === 'MODEM' || detailItem.categoryType === 'DISMANTLE') && (
                  <div className="text-[10px] text-blue-700 bg-blue-100 p-2 rounded font-medium space-y-0.5">
                    <p>Total SN Available: {service.modemSNs.filter(s => s.itemId === detailItem.id && s.status === 'AVAILABLE').length}</p>
                    <p>Total SN Terpasang: {service.modemSNs.filter(s => s.itemId === detailItem.id && s.status === 'TERPASANG').length}</p>
                    <p>Total SN Dipinjam: {service.modemSNs.filter(s => s.itemId === detailItem.id && s.status === 'DIPINJAM_TEKNISI').length}</p>
                    <p>Total SN Rusak / Karantina: {service.modemSNs.filter(s => s.itemId === detailItem.id && s.status === 'RUSAK').length}</p>
                  </div>
                )}
              </div>
            </div>

            {detailItem.description && (
              <div className="text-xs bg-slate-50 p-3 rounded border border-slate-100">
                <span className="text-slate-500 block text-[10px] font-bold mb-1">Deskripsi / Catatan Teknis:</span>
                <p className="text-slate-700">{detailItem.description}</p>
              </div>
            )}

            {(detailItem.categoryType === 'MODEM' || detailItem.categoryType === 'DISMANTLE') && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 mt-4">
                  Daftar Serial Number (SN)
                </h4>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="py-2 px-3 font-bold text-slate-600">SN / MAC</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Status</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Lokasi / PIC</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Teknisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {service.modemSNs.filter(s => s.itemId === detailItem.id).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data Serial Number.</td>
                          </tr>
                        ) : (
                          service.modemSNs.filter(s => s.itemId === detailItem.id).map(sn => (
                            <tr key={sn.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <div className="font-mono font-bold text-blue-700">{sn.serialNumber}</div>
                                {sn.macAddress && <div className="font-mono text-[10px] text-slate-500">{sn.macAddress}</div>}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  sn.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                  sn.status === 'TERPASANG' ? 'bg-blue-100 text-blue-700' :
                                  sn.status === 'DIPINJAM_TEKNISI' ? 'bg-amber-100 text-amber-700' :
                                  sn.status === 'PERGANTIAN_MODEM' ? 'bg-orange-100 text-orange-700' :
                                  sn.status === 'DISMANTLE' ? 'bg-rose-100 text-rose-700' :
                                  sn.status === 'RUSAK' ? 'bg-red-100 text-red-700 font-extrabold' :
                                  'bg-slate-200 text-slate-700'
                                }`}>
                                  {sn.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-600 max-w-[200px] truncate" title={sn.location}>
                                {sn.customerName ? <span className="font-semibold text-slate-900">{sn.customerName}</span> : sn.location}
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-600">
                                {sn.assignedTechName ? (
                                  <div className="text-blue-600 font-semibold flex items-center gap-1">
                                    <span className="w-3 h-3 inline-flex items-center justify-center bg-blue-100 rounded-full text-[8px]">T</span>
                                    {sn.assignedTechName}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 mt-4">
                Riwayat Transaksi Terakhir (Maks 10)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {service.transactions.filter(t => t.itemId === detailItem.id).slice(0, 10).map(trx => (
                  <div key={trx.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${trx.type === 'STOCK_IN' ? 'text-green-600' : trx.type === 'STOCK_OUT' ? 'text-blue-600' : 'text-amber-600'}`}>
                          {trx.type}
                        </span>
                        <span className="text-[10px] text-slate-400">{trx.date}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 max-w-[280px] truncate" title={trx.notes}>{trx.notes || '-'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${trx.type === 'STOCK_IN' || (trx.type === 'ADJUSTMENT' && trx.stockAfter > trx.stockBefore) ? 'text-green-600' : 'text-red-600'}`}>
                        {trx.type === 'STOCK_IN' || (trx.type === 'ADJUSTMENT' && trx.stockAfter > trx.stockBefore) ? '+' : '-'}{trx.quantity}
                      </span>
                      <p className="text-[10px] text-slate-500">Oleh: {trx.performedBy}</p>
                    </div>
                  </div>
                ))}
                {service.transactions.filter(t => t.itemId === detailItem.id).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">Belum ada riwayat transaksi</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          initialFromItem={transferSourceItem}
          onSuccess={() => {
            setSearchTerm(prev => prev + ' ');
            setTimeout(() => setSearchTerm(prev => prev.trim()), 0);
          }}
        />
      )}
    </div>
  );
};

