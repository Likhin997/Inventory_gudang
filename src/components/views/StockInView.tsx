import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Radio,
  Cable,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  Users,
  UserCheck
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, ItemCategoryType } from '../../types/inventory';

export const isOntPergantianOrDismantel = (itm?: Item | null) => {
  if (!itm) return false;
  const name = (itm.name || '').toUpperCase();
  const cat = (itm.categoryType || '').toUpperCase();
  return (
    cat === 'DISMANTLE' ||
    name.includes('ONT PERGANTIAN') ||
    name.includes('ONT DISMANTEL') ||
    name.includes('ONT DISMANTLE') ||
    name.includes('PERGANTIAN') ||
    name.includes('DISMANTEL') ||
    name.includes('DISMANTLE')
  );
};

interface StockInViewProps {
  preselectedItem?: Item | null;
  onSuccess?: () => void;
}

export const StockInView: React.FC<StockInViewProps> = ({ preselectedItem, onSuccess }) => {
  const service = InventoryService.getInstance();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItem ? preselectedItem.id : ''
  );

  const selectedItem = service.items.find(i => i.id === selectedItemId);

  // Batch details
  const [batchNumber, setBatchNumber] = useState(`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
  const [supplierId, setSupplierId] = useState(service.suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [dateIn, setDateIn] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>(selectedItem?.defaultPrice || '');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Additional fields for ONT PERGANTIAN / ONT DISMANTEL
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [customTeam, setCustomTeam] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Modem Serial Numbers State
  const [serialNumbers, setSerialNumbers] = useState<{ sn: string; mac: string }[]>([
    { sn: '', mac: '' }
  ]);
  const [bulkSnText, setBulkSnText] = useState('');
  const [snInputMode, setSnInputMode] = useState<'individual' | 'bulk'>('bulk');

  // Auto update unit price when item changes
  const handleItemChange = (id: string) => {
    setSelectedItemId(id);
    const itm = service.items.find(i => i.id === id);
    if (itm) {
      setUnitPrice(itm.defaultPrice || 0);
      const isSpecial = isOntPergantianOrDismantel(itm);
      if (itm.categoryType === 'KABEL') {
        setQuantity(1000);
      } else if ((itm.categoryType === 'MODEM' || itm.categoryType === 'DISMANTLE' || isSpecial)) {
        setQuantity(isSpecial ? 1 : 5);
        if (isSpecial && !notes) {
          setNotes(`Penerimaan ${itm.name}`);
        }
      } else {
        setQuantity(50);
      }
    }
  };

  const handleAutoGenerateSN = () => {
    const qty = quantity && quantity > 0 ? quantity : 10;
    const prefix = `SN${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100+Math.random()*900)}`;
    let generatedText = '';
    
    for (let i = 1; i <= qty; i++) {
      const paddedId = i.toString().padStart(3, '0');
      generatedText += `${prefix}-${paddedId}\n`;
    }
    
    setBulkSnText(generatedText.trim());
    setSnInputMode('bulk');
    
    const list = generatedText.trim().split('\n').map(sn => ({ sn: sn.trim(), mac: '' }));
    setSerialNumbers(list);
    setQuantity(list.length);
  };

  const handleParseBulkSN = () => {
    const lines = bulkSnText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const list = lines.map(line => {
      const parts = line.split(/[,;\t]/);
      return {
        sn: parts[0]?.trim().toUpperCase() || '',
        mac: parts[1]?.trim().toUpperCase() || ''
      };
    });

    setSerialNumbers(list);
    setQuantity(list.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const isSpecialOnt = isOntPergantianOrDismantel(selectedItem);
      const isModemCategory = selectedItem.categoryType === 'MODEM' || selectedItem.categoryType === 'DISMANTLE' || isSpecialOnt;

      let effectiveTeamName = teamName.trim();
      let effectiveTeamId = teamId;
      if (teamId === 'CUSTOM' || (!service.teams?.length && customTeam)) {
        effectiveTeamName = customTeam.trim();
        effectiveTeamId = `team-custom-${Date.now()}`;
      } else if (teamId && !teamName) {
        const tm = service.teams?.find(t => t.id === teamId);
        if (tm) effectiveTeamName = tm.name;
      }

      if (isSpecialOnt) {
        if (!effectiveTeamName) {
          alert('⚠️ Kolom Team wajib dipilih atau diisi untuk ONT Pergantian / ONT Dismantel!');
          return;
        }
        if (!customerName.trim()) {
          alert('⚠️ Kolom Nama Pelanggan wajib diisi untuk ONT Pergantian / ONT Dismantel!');
          return;
        }
      }

      if (isModemCategory) {
        if (serialNumbers.length === 0 || serialNumbers.some(s => !s.sn)) {
          alert('Semua baris Serial Number wajib diisi untuk kategori Modem / ONT!');
          return;
        }

        // Check for duplicates within input
        const snSet = new Set(serialNumbers.map(s => s.sn.toUpperCase()));
        if (snSet.size !== serialNumbers.length) {
          alert('Terdapat duplikasi Serial Number di dalam daftar input!');
          return;
        }
      }

      const inQty = isModemCategory ? serialNumbers.length : Number(quantity);

      service.processStockIn({
        itemId: selectedItem.id,
        quantity: inQty,
        supplierId,
        invoiceNumber,
        batchNumber,
        unitPrice: Number(unitPrice),
        notes,
        serialNumbers: isModemCategory ? serialNumbers : undefined,
        customerName: isSpecialOnt ? customerName.trim() : undefined,
        teamId: isSpecialOnt ? effectiveTeamId : undefined,
        teamName: isSpecialOnt ? effectiveTeamName : undefined
      });

      alert(`✅ Input Berhasil! Transaksi Stok Masuk berhasil disimpan ke database.\n${inQty} ${selectedItem.unit} ditambahkan ke stok.`);
      
      // Reset form data
      setBatchNumber(`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
      setNotes('');
      setBulkSnText('');
      setSerialNumbers([{ sn: '', mac: '' }]);
      setSelectedItemId('');
      setQuantity('');
      setUnitPrice('');
      setTeamId('');
      setTeamName('');
      setCustomTeam('');
      setCustomerName('');
      
      // Reset quantity based on selected item type

      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Gagal memproses stok masuk: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-blue-600" />
            <span>Form Transaksi Stok Masuk (Stock In)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Penerimaan barang dari supplier, registrasi batch nomor, dan pembentukan Serial Number unik.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
          Database Atomic Engine
        </span>
      </div>

      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center gap-2" role="alert">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="block sm:inline font-bold">Input Berhasil! Transaksi Stok Masuk berhasil disimpan.</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Item Selection */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                1
              </span>
              <span>Pilih Barang & Master Katalog</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pilih Master Barang *</label>
              <select
                value={selectedItemId}
                onChange={e => handleItemChange(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="">--- Pilih Master Barang ---</option>
                {service.items.map(i => (
                  <option key={i.id} value={i.id}>
                    [{i.code}] {i.name} ({i.categoryType})
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Stok Sistem Saat Ini</span>
                  <span className="text-xl font-bold font-mono text-green-700">
                    {selectedItem.currentStock} {selectedItem.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Kategori</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedItem.categoryType}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Tambahan Khusus ONT PERGANTIAN / ONT DISMANTEL */}
          {selectedItem && isOntPergantianOrDismantel(selectedItem) && (
            <div className="mt-3 p-4 rounded-lg border-2 border-amber-400 bg-amber-50/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-500 text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Data Khusus: ONT Pergantian / ONT Dismantel
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Wajib mencantumkan Team penarik dan Nama Pelanggan sumber ONT.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  Data Penarikan Lapangan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Kolom Team */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                    <span>Team Penarik / Petugas Lapangan *</span>
                  </label>
                  {service.teams && service.teams.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={teamId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamId(val);
                          if (val !== 'CUSTOM') {
                            const tm = service.teams.find(t => t.id === val);
                            if (tm) setTeamName(tm.name);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-md bg-white border border-amber-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        required={teamId !== 'CUSTOM'}
                      >
                        <option value="">-- Pilih Team Petugas --</option>
                        {service.teams.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.leader ? `(Leader: ${t.leader})` : ''}
                          </option>
                        ))}
                        <option value="CUSTOM">+ Input Manual Nama Team...</option>
                      </select>

                      {teamId === 'CUSTOM' && (
                        <input
                          type="text"
                          required
                          placeholder="Ketik nama team (cth: Team Charlie, Team Dismantle 1)"
                          value={customTeam}
                          onChange={e => setCustomTeam(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-white border border-amber-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-slate-400"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Ketik nama team (cth: Team Alfa, Team Charlie)"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-white border border-amber-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-slate-400"
                    />
                  )}
                </div>

                {/* Kolom Nama Pelanggan */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                    <span>Nama Pelanggan (Customer Name) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama pelanggan sumber ONT (cth: Bpk. Gunawan, Toko Sahabat)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white border border-amber-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-amber-800 mt-1">
                    Nama pelanggan akan otomatis terasosiasi dengan nomor seri (SN) dan riwayat barang.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Batch & Purchase Info */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                2
              </span>
              <span>Informasi Batch & Surat Penerimaan (PO / Invoice)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Nomor Batch *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Supplier / Vendor *</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {service.suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Nomor Invoice / Surat Jalan *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Tanggal Masuk Barang</label>
              <input
                type="date"
                required
                value={dateIn}
                onChange={e => setDateIn(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Jumlah Masuk ({selectedItem?.unit || 'unit'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantity}
                onChange={e => {
                  const val = e.target.value === "" ? "" : (parseFloat(e.target.value) || 0);
                  setQuantity(val);
                }}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Harga Beli Satuan (Rp)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1 text-xs">Catatan Tambahan / PO Referensi</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              placeholder="misal: Batch pengadaan Q3 2026, kondisi box segel..."
            />
          </div>
        </div>

        {/* Step 3: Specific Serial Number Generator (ONLY FOR MODEM & ONT DISMANTEL / PERGANTIAN) */}
        {(selectedItem?.categoryType === 'MODEM' || selectedItem?.categoryType === 'DISMANTLE' || isOntPergantianOrDismantel(selectedItem)) && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  3
                </span>
                <span>Registrasi Serial Number Modem (Wajib Unik)</span>
              </h3>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSnInputMode('bulk')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    snInputMode === 'bulk' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 Bulk Paste / CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSnInputMode('individual')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    snInputMode === 'individual' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✏️ Manual Per Baris
                </button>
                {service.currentUser?.role === 'SUPERADMIN' && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateSN}
                    className="px-2 py-0.5 rounded font-bold transition-colors text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                  >
                    ⚡ Auto Generate
                  </button>
                )}
              </div>
            </div>

            {/* BULK PASTE MODE */}
            {snInputMode === 'bulk' && (
              <div className="p-3 rounded bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
                <p className="text-slate-600">
                  Paste daftar Serial Number (dan opsional MAC address dipisah koma/tab per baris):
                </p>
                <textarea
                  rows={4}
                  value={bulkSnText}
                  onChange={e => setBulkSnText(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-white border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                  placeholder="HW-2026-0001, 74:83:C2:AA:BB:CC&#10;HW-2026-0002, 74:83:C2:AA:BB:CD"
                />
                <button
                  type="button"
                  onClick={handleParseBulkSN}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Terapkan Bulk Serial Numbers
                </button>
              </div>
            )}

            {/* PREVIEW / EDIT LIST */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span>Daftar {serialNumbers.length} Serial Number Terbentuk:</span>
                <button
                  type="button"
                  onClick={() => setSerialNumbers([...serialNumbers, { sn: '', mac: '' }])}
                  className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Tambah Baris
                </button>
              </div>

              {serialNumbers.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[11px] font-mono text-slate-400 w-6 text-center">#{idx + 1}</span>
                  <input
                    type="text"
                    required
                    placeholder="Serial Number (SN)"
                    value={row.sn}
                    onChange={e => {
                      const next = [...serialNumbers];
                      next[idx].sn = e.target.value.toUpperCase();
                      setSerialNumbers(next);
                    }}
                    className="flex-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-mono text-blue-700 font-bold focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="MAC Address (Opsional)"
                    value={row.mac}
                    onChange={e => {
                      const next = [...serialNumbers];
                      next[idx].mac = e.target.value.toUpperCase();
                      setSerialNumbers(next);
                    }}
                    className="w-48 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  {serialNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSerialNumbers(serialNumbers.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">
            Transaksi ini akan memotong saldo supplier dan menambah aset aktif perusahaan secara terpusat.
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Simpan & Verifikasi Stok Masuk</span>
          </button>
        </div>
      </form>
    </div>
  );
};
