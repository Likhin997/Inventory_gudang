import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  CheckCircle2, 
  Boxes, 
  Plus, 
  Layers, 
  Radio, 
  Search, 
  AlertCircle 
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, ModemSerialNumber } from '../../types/inventory';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFromItem?: Item | null;
  initialSNs?: string[];
  onSuccess?: () => void;
}

const EMPTY_SNS: string[] = [];

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  initialFromItem,
  initialSNs = EMPTY_SNS,
  onSuccess
}) => {
  const service = InventoryService.getInstance();
  const allItems = service.items;

  // Selected source item
  const [fromItemId, setFromItemId] = useState<string>('');
  
  // Destination options: 'existing' or 'new'
  const [destMode, setDestMode] = useState<'existing' | 'new'>('existing');
  const [toItemId, setToItemId] = useState<string>('');

  // Fields for creating a new destination item
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCode, setNewItemCode] = useState<string>('');
  const [newItemBrand, setNewItemBrand] = useState<string>('');
  const [newItemModel, setNewItemModel] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<string>('pcs');
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('');

  // Transfer quantity and selected SNs
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSNs, setSelectedSNs] = useState<string[]>([]);
  const [snSearchTerm, setSnSearchTerm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fromItemIdProp = initialFromItem?.id || '';
  const initialSNsKey = (initialSNs || EMPTY_SNS).join(',');

  // Initialize or reset ONLY when opened or when source item/SNs change
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialFromItem) {
      setFromItemId(initialFromItem.id);
      setNewItemBrand(initialFromItem.brand || '');
      setNewItemModel(initialFromItem.model || '');
      setNewItemUnit(initialFromItem.unit || 'pcs');
      setNewItemCategoryId(initialFromItem.categoryId || service.categories[0]?.id || '');
      setNewItemCode(`SKU-${Date.now().toString().slice(-5)}`);
      setNewItemName(`${initialFromItem.name} Pinjam Piang`);
    } else if (allItems.length > 0) {
      // Pick first item that has stock
      const firstWithStock = allItems.find(i => i.currentStock > 0) || allItems[0];
      setFromItemId(firstWithStock.id);
      setNewItemBrand(firstWithStock.brand || '');
      setNewItemModel(firstWithStock.model || '');
      setNewItemUnit(firstWithStock.unit || 'pcs');
      setNewItemCategoryId(firstWithStock.categoryId || service.categories[0]?.id || '');
      setNewItemCode(`SKU-${Date.now().toString().slice(-5)}`);
      setNewItemName(`${firstWithStock.name} Pinjam Piang`);
    }

    if (initialSNs && initialSNs.length > 0) {
      setSelectedSNs(initialSNs);
      setQuantity(initialSNs.length);
    } else {
      setSelectedSNs([]);
      setQuantity(1);
    }

    setToItemId('');
    setDestMode('existing');
    setNotes('');
    setErrorMsg('');
    setIsSubmitting(false);
  }, [isOpen, fromItemIdProp, initialSNsKey]);

  const fromItem = useMemo(() => {
    return allItems.find(i => i.id === fromItemId);
  }, [allItems, fromItemId]);

  // When fromItem changes, update default suggestions for new destination item
  const handleFromItemChange = (id: string) => {
    setFromItemId(id);
    setSelectedSNs([]);
    setQuantity(1);
    setErrorMsg('');

    const itm = allItems.find(i => i.id === id);
    if (itm) {
      setNewItemBrand(itm.brand || '');
      setNewItemModel(itm.model || '');
      setNewItemUnit(itm.unit || 'pcs');
      setNewItemCategoryId(itm.categoryId || service.categories[0]?.id || '');
      setNewItemCode(`SKU-${Date.now().toString().slice(-5)}`);
      setNewItemName(`${itm.name} Pinjam Piang`);
    }
  };

  // Available SNs belonging to the selected source item
  const availableSNsForFromItem: ModemSerialNumber[] = useMemo(() => {
    if (!fromItem) return [];
    return service.modemSNs.filter(s => 
      (s.itemId === fromItem.id || (s.itemName && s.itemName.toLowerCase() === fromItem.name.toLowerCase())) &&
      s.status === 'AVAILABLE'
    );
  }, [service.modemSNs, fromItem]);

  const isSerialized = fromItem?.isSerialTracked || fromItem?.categoryType === 'MODEM' || availableSNsForFromItem.length > 0;

  // Filtered SNs by search term
  const filteredCandidateSNs = useMemo(() => {
    if (!snSearchTerm.trim()) return availableSNsForFromItem;
    const term = snSearchTerm.toLowerCase();
    return availableSNsForFromItem.filter(s =>
      s.serialNumber.toLowerCase().includes(term) ||
      (s.macAddress && s.macAddress.toLowerCase().includes(term))
    );
  }, [availableSNsForFromItem, snSearchTerm]);

  const handleToggleSN = (snStr: string) => {
    let next: string[];
    if (selectedSNs.includes(snStr)) {
      next = selectedSNs.filter(s => s !== snStr);
    } else {
      next = [...selectedSNs, snStr];
    }
    setSelectedSNs(next);
    setQuantity(Math.max(1, next.length));
  };

  const handleSelectAllSNs = () => {
    if (selectedSNs.length === filteredCandidateSNs.length) {
      setSelectedSNs([]);
      setQuantity(1);
    } else {
      const allFiltered = filteredCandidateSNs.map(s => s.serialNumber);
      setSelectedSNs(allFiltered);
      setQuantity(allFiltered.length);
    }
  };

  // Eligible destination items (all except source item)
  const eligibleDestinationItems = useMemo(() => {
    return allItems.filter(i => i.id !== fromItemId);
  }, [allItems, fromItemId]);

  const targetItem = useMemo(() => {
    if (destMode === 'existing') {
      return allItems.find(i => i.id === toItemId);
    }
    return null;
  }, [allItems, destMode, toItemId]);

  // Handle transfer submit
  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fromItem) {
      setErrorMsg('Pilih barang asal yang valid.');
      return;
    }

    if (fromItem.currentStock < quantity) {
      setErrorMsg(`Stok ${fromItem.name} tidak cukup (Tersedia: ${fromItem.currentStock}, Diminta: ${quantity}).`);
      return;
    }

    if (isSerialized && availableSNsForFromItem.length > 0 && selectedSNs.length === 0) {
      setErrorMsg('Pilih minimal satu Serial Number yang ingin dipindahkan.');
      return;
    }

    let finalToItemId = toItemId;

    try {
      setIsSubmitting(true);

      // Create destination item if in 'new' mode
      if (destMode === 'new') {
        const trimmedName = newItemName.trim();
        if (!trimmedName) {
          setErrorMsg('Nama barang tujuan baru wajib diisi!');
          setIsSubmitting(false);
          return;
        }

        const category = service.categories.find(c => c.id === newItemCategoryId) || service.categories[0];
        const created = service.createItem({
          code: newItemCode.trim() || `SKU-${Date.now().toString().slice(-5)}`,
          name: trimmedName,
          categoryId: category?.id || fromItem.categoryId || '',
          categoryType: category?.type || fromItem.categoryType || 'MODEM',
          brand: newItemBrand.trim() || fromItem.brand || '',
          model: newItemModel.trim() || fromItem.model || '',
          unit: newItemUnit.trim() || fromItem.unit || 'pcs',
          currentStock: 0,
          minimumStock: fromItem.minimumStock || 10,
          location: fromItem.location || 'Gudang Utama',
          defaultPrice: fromItem.defaultPrice || 0,
          description: `Master barang turunan/mutasi dari ${fromItem.name}`,
          isSerialTracked: fromItem.isSerialTracked || fromItem.categoryType === 'MODEM'
        });

        finalToItemId = created.id;
      }

      if (!finalToItemId) {
        setErrorMsg('Pilih barang tujuan yang valid.');
        setIsSubmitting(false);
        return;
      }

      // Execute transfer
      service.transferItemStock({
        fromItemId: fromItem.id,
        toItemId: finalToItemId,
        quantity: isSerialized && selectedSNs.length > 0 ? selectedSNs.length : quantity,
        serialNumbers: selectedSNs.length > 0 ? selectedSNs : undefined,
        notes: notes.trim() || undefined
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses pemindahan stok!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pindah / Mutasi Stok Barang</h3>
              <p className="text-xs text-slate-500">
                Pindahkan kuantitas atau Serial Number dari satu master barang ke master barang lainnya.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitTransfer} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          
          {/* 1. SOURCE ITEM */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <label className="block text-slate-800 font-bold uppercase text-[11px] tracking-wide">
              1. Barang Asal (Sumber Stok) <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={fromItemId}
              onChange={e => handleFromItemChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            >
              {allItems.map(i => (
                <option key={i.id} value={i.id} disabled={i.currentStock <= 0}>
                  {i.name} (SKU: {i.code}) — Stok Gudang: {i.currentStock} {i.unit} {i.currentStock <= 0 ? '[HABIS]' : ''}
                </option>
              ))}
            </select>

            {fromItem && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Kategori: {fromItem.categoryType}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  Stok Saat Ini: {fromItem.currentStock} {fromItem.unit}
                </span>
                {availableSNsForFromItem.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                    SN Tersedia: {availableSNsForFromItem.length} unit
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. DESTINATION ITEM */}
          <div className="bg-indigo-50/40 p-3.5 rounded-lg border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-indigo-950 font-bold uppercase text-[11px] tracking-wide">
                2. Barang Tujuan (Penerima Stok) <span className="text-red-500">*</span>
              </label>
              
              <div className="inline-flex rounded-lg border border-indigo-200 p-0.5 bg-white text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDestMode('existing')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    destMode === 'existing' 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pilih Master Yang Ada
                </button>
                <button
                  type="button"
                  onClick={() => setDestMode('new')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    destMode === 'new' 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="h-3 w-3" />
                  <span>+ Buat Master Baru</span>
                </button>
              </div>
            </div>

            {destMode === 'existing' ? (
              <div>
                <select
                  required={destMode === 'existing'}
                  value={toItemId}
                  onChange={e => setToItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="">Pilih barang tujuan...</option>
                  {eligibleDestinationItems.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (SKU: {i.code}) — Stok Saat Ini: {i.currentStock} {i.unit}
                    </option>
                  ))}
                </select>

                {targetItem && (
                  <div className="mt-2 p-2 rounded bg-white border border-indigo-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">
                      Target: <strong className="text-slate-900">{targetItem.name}</strong>
                    </span>
                    <span className="text-indigo-700 font-bold">
                      Stok Setelah Pindah: {targetItem.currentStock + quantity} {targetItem.unit}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-white p-3 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Master barang baru akan langsung dibuat otomatis di sistem</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Master Barang Tujuan Baru <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={destMode === 'new'}
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="misal: ONT ZTE Pinjam Piang"
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Contoh: <em>ONT ZTE Pinjam Piang</em>, <em>ONT ZTE Second</em>, atau <em>ONT ZTE Backup</em>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Kode SKU Baru</label>
                    <input
                      type="text"
                      value={newItemCode}
                      onChange={e => setNewItemCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                    <select
                      value={newItemCategoryId}
                      onChange={e => setNewItemCategoryId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {service.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Brand / Merek</label>
                    <input
                      type="text"
                      value={newItemBrand}
                      onChange={e => setNewItemBrand(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Model / Tipe</label>
                    <input
                      type="text"
                      value={newItemModel}
                      onChange={e => setNewItemModel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Satuan</label>
                    <input
                      type="text"
                      value={newItemUnit}
                      onChange={e => setNewItemUnit(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SERIAL NUMBER SELECTION (IF MODEM / SERIALIZED) */}
          {isSerialized && availableSNsForFromItem.length > 0 ? (
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-slate-800 font-bold uppercase text-[11px] tracking-wide">
                    3. Pilih Serial Number Yang Dipindahkan ({selectedSNs.length} dari {availableSNsForFromItem.length} unit) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Pilih unit modem AVAILABLE yang akan dialihkan ke master tujuan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllSNs}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  {selectedSNs.length === filteredCandidateSNs.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>

              {/* Search SN */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Serial Number atau MAC..."
                  value={snSearchTerm}
                  onChange={e => setSnSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 text-slate-900 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* SN List with Checkboxes */}
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                {filteredCandidateSNs.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Tidak ada Serial Number yang berstatus AVAILABLE.
                  </div>
                ) : (
                  filteredCandidateSNs.map(sn => {
                    const isChecked = selectedSNs.includes(sn.serialNumber);
                    return (
                      <label
                        key={sn.id}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-indigo-50/50 ${
                          isChecked ? 'bg-indigo-50/70 text-indigo-900' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSN(sn.serialNumber)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-mono font-bold">{sn.serialNumber}</span>
                            {sn.macAddress && (
                              <span className="font-mono text-[10px] text-slate-400 ml-2">
                                MAC: {sn.macAddress}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          AVAILABLE
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Quantity input for non-serialized or bulk */
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold uppercase text-[11px] tracking-wide">
                3. Jumlah Unit Yang Dipindahkan <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={fromItem?.currentStock || 1}
                  required
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-bold text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-slate-600 font-semibold">
                  {fromItem?.unit || 'pcs'} (Tersedia: {fromItem?.currentStock || 0})
                </span>
              </div>
            </div>
          )}

          {/* 4. NOTES */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Catatan / Alasan Pindah Stok
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="misal: Alokasi modem unit pinjaman ke master ONT ZTE Pinjam Piang..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
            />
          </div>

          {/* 5. IMPACT SUMMARY BOX */}
          {fromItem && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-lg space-y-2">
              <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-indigo-600" />
                <span>Ringkasan Dampak Perubahan Stok:</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-white rounded border border-indigo-100">
                  <span className="text-slate-500 text-[10px] block">Barang Asal:</span>
                  <p className="font-bold text-slate-900 truncate">{fromItem.name}</p>
                  <p className="text-red-600 font-semibold mt-1">
                    Stok: {fromItem.currentStock} → {fromItem.currentStock - quantity} {fromItem.unit} (-{quantity})
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-indigo-100">
                  <span className="text-slate-500 text-[10px] block">Barang Tujuan:</span>
                  <p className="font-bold text-slate-900 truncate">
                    {destMode === 'new' ? (newItemName || 'Master Barang Baru') : (targetItem?.name || 'Belum dipilih')}
                  </p>
                  <p className="text-emerald-600 font-semibold mt-1">
                    Stok: {targetItem ? targetItem.currentStock : 0} → {(targetItem?.currentStock || 0) + quantity} {fromItem.unit} (+{quantity})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Pindah Stok'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
