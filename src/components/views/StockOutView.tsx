import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpFromLine, 
  Radio, 
  Cable, 
  Package, 
  UserCheck, 
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  Trash2,
  Plus,
  Users,
  RotateCcw,
  Terminal
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, ModemSerialNumber } from '../../types/inventory';
import { logger } from '../../utils/logger';

interface StockOutViewProps {
  preselectedItem?: Item | null;
  preselectedSN?: ModemSerialNumber | null;
  onSuccess?: () => void;
  onOpenErrorModal?: () => void;
}

interface CartItem {
  cartId: string;
  itemId: string;
  quantity: number;
  notes: string;
  selectedSNs: string[];
}

export const isModemItem = (item?: Item | null): boolean => {
  if (!item) return false;
  const cat = (item.categoryType || '').toUpperCase();
  const name = (item.name || '').toUpperCase();
  return (
    cat === 'MODEM' || 
    cat === 'DISMANTLE' || 
    Boolean(item.isSerialTracked) || 
    name.includes('ONT') || 
    name.includes('MODEM')
  );
};

export const StockOutView: React.FC<StockOutViewProps> = ({ 
  preselectedItem, 
  preselectedSN, 
  onSuccess, 
  onOpenErrorModal 
}) => {
  const service = InventoryService.getInstance();
  const [, setTick] = useState(0);
  const [showAllAvailableSNs, setShowAllAvailableSNs] = useState(false);

  // Subscribe to service updates so changes in items/modemSNs are reflected instantly
  useEffect(() => {
    return service.subscribe(() => {
      setTick(t => t + 1);
    });
  }, [service]);
  
  // Recipient info (multiple technicians)
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    service.teams.length > 0 ? service.teams[0].id : ''
  );
  
  const [projectName, setProjectName] = useState(service.projects.length > 0 ? service.projects[0].name : '');
  const [purpose, setPurpose] = useState('Instalasi Baru Pelanggan FTTH');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Current Item Draft State: prioritize preselectedItem / preselectedSN / available modem item
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    if (preselectedSN) {
      const match = service.items.find(i => i.id === preselectedSN.itemId || (preselectedSN.itemName && i.name.toLowerCase() === preselectedSN.itemName.toLowerCase()));
      if (match) return match.id;
    }
    if (preselectedItem?.id) return preselectedItem.id;
    const modem = service.items.find(i => isModemItem(i) && (i.currentStock > 0 || service.modemSNs.some(s => (s.itemId === i.id || s.itemName === i.name) && s.status === 'AVAILABLE')));
    if (modem) return modem.id;
    const anyModem = service.items.find(i => isModemItem(i));
    return anyModem?.id || service.items[0]?.id || '';
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSNs, setSelectedSNs] = useState<string[]>(() => {
    return preselectedSN?.serialNumber ? [preselectedSN.serialNumber] : [];
  });
  const [notes, setNotes] = useState('');
  const [searchModem, setSearchModem] = useState('');

  const preselectedItemId = preselectedItem?.id;
  const preselectedSNValue = preselectedSN?.serialNumber;

  // Synchronize selected item when preselectedSN, preselectedItem or items change
  useEffect(() => {
    if (preselectedSN) {
      const itm = service.items.find(i => i.id === preselectedSN.itemId || (preselectedSN.itemName && i.name.toLowerCase() === preselectedSN.itemName.toLowerCase()));
      if (itm) {
        setSelectedItemId(itm.id);
      } else {
        const defaultModem = service.items.find(i => isModemItem(i));
        if (defaultModem) setSelectedItemId(defaultModem.id);
      }
      setSelectedSNs([preselectedSN.serialNumber]);
      setQuantity(1);
    } else if (preselectedItemId) {
      if (selectedItemId !== preselectedItemId) {
        handleItemChange(preselectedItemId);
      }
    } else if (!selectedItemId || !service.items.some(i => i.id === selectedItemId)) {
      if (service.items.length > 0) {
        const defaultModem = service.items.find(i => 
          isModemItem(i) && (i.currentStock > 0 || service.modemSNs.some(s => (s.itemId === i.id || s.itemName === i.name) && s.status === 'AVAILABLE'))
        );
        handleItemChange(defaultModem?.id || service.items.find(i => isModemItem(i))?.id || service.items[0].id);
      }
    }
  }, [preselectedItemId, preselectedSNValue, service.items.length]);

  // Synchronize team if not selected yet
  useEffect(() => {
    if (!selectedTeamId && service.teams.length > 0) {
      setSelectedTeamId(service.teams[0].id);
    }
  }, [service.teams, selectedTeamId]);

  const selectedItem = service.items.find(i => i.id === selectedItemId);

  const availableModemSNs = useMemo(() => {
    if (!selectedItem) return [];
    if (!isModemItem(selectedItem) && !showAllAvailableSNs) return [];

    const usedSNsInCart = cart.flatMap(c => c.itemId === selectedItemId ? c.selectedSNs : []);
    const selName = (selectedItem.name || '').trim().toLowerCase();

    return (service.modemSNs || []).filter(s => {
      // Must have valid serial number
      if (!s.serialNumber) return false;
      // Must be AVAILABLE and not already chosen in cart
      const statusUpper = (s.status || '').trim().toUpperCase();
      if (statusUpper !== 'AVAILABLE') return false;
      if (usedSNsInCart.includes(s.serialNumber)) return false;

      // Always include preselectedSN if passed
      if (preselectedSN && s.serialNumber === preselectedSN.serialNumber) return true;

      // If user toggled show all available, include all available SNs
      if (showAllAvailableSNs) return true;

      // 1. Direct item ID match
      if (s.itemId && s.itemId === selectedItemId) return true;

      // 2. Direct name match
      if (s.itemName && s.itemName.trim().toLowerCase() === selName) return true;

      // 3. Model or brand match
      if (s.model && selName.includes(s.model.toLowerCase())) return true;
      if (s.brand && selName.includes(s.brand.toLowerCase())) return true;

      // 4. If selected item is ONT/modem and serial number record represents ONT/modem
      if (selName.includes('ont') && ((s.itemName || '').toLowerCase().includes('ont') || (s.model || '').toLowerCase().includes('ont'))) {
        return true;
      }

      // 5. Fallback: if s has no itemId, and selectedItem is a modem
      if (!s.itemId && isModemItem(selectedItem)) return true;

      return false;
    });
  }, [selectedItem, service.modemSNs, cart, selectedItemId, showAllAvailableSNs, preselectedSN]);

  const filteredModemSNs = useMemo(() => {
    if (!searchModem) return availableModemSNs;
    const q = searchModem.toLowerCase().trim();
    return availableModemSNs.filter(sn => 
      (sn.serialNumber || '').toLowerCase().includes(q) ||
      (sn.macAddress && sn.macAddress.toLowerCase().includes(q)) ||
      (sn.itemName && sn.itemName.toLowerCase().includes(q)) ||
      (sn.model && sn.model.toLowerCase().includes(q)) ||
      (sn.brand && sn.brand.toLowerCase().includes(q)) ||
      (sn.batchNumber && sn.batchNumber.toLowerCase().includes(q))
    );
  }, [availableModemSNs, searchModem]);
  
  const handleTechToggle = (id: string) => {
    setSelectedTechIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleItemChange = (iId: string) => {
    setSelectedItemId(iId);
    const itm = service.items.find(i => i.id === iId);
    setSelectedSNs([]);
    if (itm?.categoryType === 'KABEL') {
      setQuantity(150);
    } else if (isModemItem(itm)) {
      setQuantity(1);
    } else {
      setQuantity(10);
    }
  };

  const handleAutoPickFIFO = () => {
    const pickCount = Math.min(quantity, filteredModemSNs.length);
    const picked = filteredModemSNs.slice(0, pickCount).map(s => s.serialNumber);
    setSelectedSNs(picked);
  };

  const toggleSNSelection = (sn: string) => {
    if (selectedSNs.includes(sn)) {
      setSelectedSNs(selectedSNs.filter(s => s !== sn));
    } else {
      if (selectedSNs.length < quantity) {
        setSelectedSNs([...selectedSNs, sn]);
      } else {
        // If already at quantity, replace last or inform
        if (quantity === 1) {
          setSelectedSNs([sn]);
        }
      }
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;
    if (quantity <= 0) {
      alert('Quantity harus lebih dari 0');
      return;
    }

    if (isModemItem(selectedItem) && selectedSNs.length !== quantity) {
      alert(`Wajib memilih tepat ${quantity} Serial Number! Saat ini baru dipilih ${selectedSNs.length} unit.`);
      return;
    }

    const currentStock = selectedItem.currentStock;
    const qtyInCart = cart.filter(c => c.itemId === selectedItemId).reduce((acc, c) => acc + c.quantity, 0);
    
    if (quantity + qtyInCart > currentStock) {
      alert('Stok tidak mencukupi untuk jumlah ini (termasuk yang sudah di keranjang).');
      return;
    }

    setCart([...cart, {
      cartId: `c-${Date.now()}`,
      itemId: selectedItemId,
      quantity,
      selectedSNs,
      notes
    }]);

    setSelectedSNs([]);
    setQuantity(1);
    setNotes('');
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.cartId !== cartId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Keranjang pengeluaran kosong!');
      return;
    }
    if (!selectedTeamId) {
      alert('Pilih setidaknya satu tim!');
      return;
    }

    try {
      const teamObj = service.teams.find(t => t.id === selectedTeamId);
      const cartSummary = cart.map(c => {
        const itm = service.items.find(i => i.id === c.itemId);
        return `${itm?.name || c.itemId} x${c.quantity} [${c.selectedSNs.join(',')}]`;
      }).join('; ');
      logger.addLog('info', 'StockOut', `Memproses pengeluaran barang untuk Tim "${teamObj?.name || selectedTeamId}": ${cart.length} jenis barang (${cartSummary})`);
      service.processBulkStockOut({
        techIds: [],
        teamId: selectedTeamId,
        project: projectName,
        purpose,
        date: new Date().toISOString().slice(0, 10),
        items: cart.map(c => ({
          itemId: c.itemId,
          quantity: c.quantity,
          notes: c.notes,
          selectedSerialNumbers: c.selectedSNs
        }))
      });
      logger.addLog('info', 'StockOut', `✅ Sukses catat pengeluaran barang untuk Tim "${teamObj?.name || selectedTeamId}"`);
      alert('✅ Berhasil mencatat pengeluaran barang bulk!');
      setCart([]);
      setSelectedTechIds([]);
      setSelectedTeamId("");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      logger.addLog('error', 'StockOut', `❌ Gagal pengeluaran barang: ${error.message}`, error);
      alert(`❌ Gagal: ${error.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ArrowUpFromLine className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpFromLine className="w-6 h-6 text-rose-600" />
            Pengeluaran Barang (Stock Out)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Keluarkan barang dari gudang untuk keperluan lapangan teknisi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Informasi Penerima / Teknisi</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row justify-between mb-2">
                  <label className="block text-slate-700 font-medium">Pilih Tim Penerima</label>
                </div>

                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">----Pilih Team----</option>
                  {(service.teams || []).filter(t => t.isActive).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Leader: {t.leader})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nama Project / Area</label>
                  <select
                    required
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="" disabled>Pilih Project / Area</option>
                    {service.projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name} {p.client ? `- ${p.client}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Keperluan / Tujuan</label>
                  <select
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Instalasi Baru Pelanggan FTTH">Instalasi Baru Pelanggan FTTH</option>
                    <option value="Maintenance / Perbaikan">Maintenance / Perbaikan</option>
                    <option value="Pindah Tiang / Jalur">Pindah Tiang / Jalur</option>
                    <option value="Lainnya">Lainnya...</option>
                  </select>
                </div>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-800">Pilih Barang</h3>
              </div>
            </div>
            
            <div className="p-4">
              {service.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                  <p>Tidak ada data barang di sistem.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-medium">Pilih Item dari Gudang</label>
                      {onOpenErrorModal && (
                        <button
                          type="button"
                          onClick={onOpenErrorModal}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Cek Log Error & Diagnostik</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedItemId}
                      onChange={e => handleItemChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                    >
                      <optgroup label="Modem / ONT (Tracking Serial Number)">
                        {service.items.filter(i => isModemItem(i)).map(item => (
                          <option key={item.id} value={item.id}>
                            [{item.code}] {item.name} - Stok: {item.currentStock} {item.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Material, Kabel & Aksesoris Non-SN">
                        {service.items.filter(i => !isModemItem(i)).map(item => (
                          <option key={item.id} value={item.id}>
                            [{item.code}] {item.name} - Stok: {item.currentStock} {item.unit}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {selectedItem && (
                    <div className={`p-4 rounded-xl border ${
                      isModemItem(selectedItem) ? 'bg-blue-50/50 border-blue-100' :
                      selectedItem.categoryType === 'KABEL' ? 'bg-green-50/50 border-green-100' :
                      'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-slate-700 font-medium">
                              Jumlah / Quantity 
                              <span className="text-xs text-slate-500 ml-1 font-normal">({selectedItem.unit})</span>
                            </label>
                            <span className="text-xs text-slate-500">
                              Stok Sistem: <strong className="text-slate-800">{selectedItem.currentStock} {selectedItem.unit}</strong>
                            </span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={selectedItem.currentStock}
                            step={selectedItem.categoryType === 'KABEL' ? '0.1' : '1'}
                            value={quantity || ''}
                            onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {!isModemItem(selectedItem) && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Barang ini tidak menggunakan Serial Number</span>
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              Jika Anda ingin mengeluarkan Modem / ONT (misal ONT ZNET F660), silakan pilih model modem di dropdown di atas.
                            </p>
                          </div>
                          {service.items.some(i => isModemItem(i)) && (
                            <button
                              type="button"
                              onClick={() => {
                                const m = service.items.find(i => isModemItem(i) && (i.currentStock > 0 || service.modemSNs.some(s => s.status === 'AVAILABLE')));
                                if (m) handleItemChange(m.id);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
                            >
                              Ganti ke Modem (ONT) →
                            </button>
                          )}
                        </div>
                      )}

                      {isModemItem(selectedItem) && (
                        <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <label className="block text-slate-800 font-bold text-sm">
                                  Pilih Serial Number (Wajib {quantity} unit)
                                </label>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  selectedSNs.length === quantity
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {selectedSNs.length} dari {quantity} dipilih
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Unit tersedia di gudang: <strong className="text-blue-700">{availableModemSNs.length} unit</strong> (Status: AVAILABLE)
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button 
                                type="button"
                                onClick={handleAutoPickFIFO}
                                className="text-xs font-semibold bg-blue-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                                title="Otomatis pilih SN tertua / urut FIFO"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Auto-Pick ({Math.min(quantity, filteredModemSNs.length)})
                              </button>
                              {selectedSNs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedSNs([])}
                                  className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Reset pilihan SN"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Reset
                                </button>
                              )}
                              {onOpenErrorModal && (
                                <button
                                  type="button"
                                  onClick={onOpenErrorModal}
                                  className="text-xs font-medium text-slate-700 bg-white border border-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Buka Log Error & Diagnostik SN"
                                >
                                  <Terminal className="w-3 h-3 text-slate-600" />
                                  Diagnostik
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showAllAvailableSNs}
                                onChange={e => setShowAllAvailableSNs(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>Tampilkan Semua Serial Number AVAILABLE di Gudang ({service.modemSNs.filter(s => s.status === 'AVAILABLE').length} unit)</span>
                            </label>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Cari SN, MAC Address, Model, Batch..."
                              value={searchModem}
                              onChange={(e) => setSearchModem(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            />
                          </div>
                          
                          <div className="bg-white rounded-lg border border-slate-200 p-2 max-h-56 overflow-y-auto shadow-inner">
                            {filteredModemSNs.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {filteredModemSNs.map(sn => {
                                  const isSelected = selectedSNs.includes(sn.serialNumber);
                                  return (
                                    <button
                                      key={sn.id}
                                      type="button"
                                      onClick={() => toggleSNSelection(sn.serialNumber)}
                                      className={`text-left px-2.5 py-2 rounded-lg text-xs border transition-all cursor-pointer ${
                                        isSelected 
                                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold ring-1 ring-blue-400' 
                                          : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-white hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="min-w-0 pr-1">
                                          <span className="font-mono font-bold block truncate text-slate-900">{sn.serialNumber}</span>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate mt-0.5">
                                            {sn.brand && <span>{sn.brand}</span>}
                                            {sn.batchNumber && <span>• {sn.batchNumber}</span>}
                                          </div>
                                        </div>
                                        {isSelected ? (
                                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                                {searchModem ? (
                                  <p>Tidak ada Serial Number yang cocok dengan pencarian "<strong>{searchModem}</strong>".</p>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-slate-700">Tidak ada Serial Number berstatus AVAILABLE untuk item ini.</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Total modem di sistem: {service.modemSNs.length} unit ({service.modemSNs.filter(s => s.status === 'AVAILABLE').length} AVAILABLE).</p>
                                  </div>
                                )}
                                <div className="flex items-center justify-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setShowAllAvailableSNs(true)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Tampilkan Semua SN Tersedia ({service.modemSNs.filter(s => s.status === 'AVAILABLE').length} unit)
                                  </button>
                                  {onOpenErrorModal && (
                                    <button
                                      type="button"
                                      onClick={onOpenErrorModal}
                                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                                    >
                                      Buka Log Error & Diagnostik
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-slate-700 font-medium mb-1 text-sm">Catatan Item (Opsional)</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Misal: Untuk pelanggan VIP"
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={addToCart}
                        className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah ke Keranjang
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-50 rounded-xl border border-slate-200 sticky top-4 shadow-sm flex flex-col h-[calc(100vh-2rem)] max-h-[800px]">
            <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Keranjang
                <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                  {cart.length} item
                </span>
              </h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                  <Package className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm">Belum ada item ditambahkan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(c => {
                    const itemData = service.getItemById(c.itemId);
                    if (!itemData) return null;
                    return (
                      <div key={c.cartId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                        <button 
                          onClick={() => removeFromCart(c.cartId)}
                          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="flex gap-3 pr-8">
                          <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                            isModemItem(itemData) ? 'bg-blue-100 text-blue-600' :
                            itemData.categoryType === 'KABEL' ? 'bg-green-100 text-green-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {isModemItem(itemData) && <Radio className="w-5 h-5" />}
                            {itemData.categoryType === 'KABEL' && <Cable className="w-5 h-5" />}
                            {!isModemItem(itemData) && itemData.categoryType !== 'KABEL' && <Package className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{itemData.name}</h4>
                            <div className="text-xs text-slate-500 flex gap-3 mt-1">
                              <span className="font-semibold text-rose-600">{c.quantity} {itemData.unit}</span>
                              {c.notes && <span>• {c.notes}</span>}
                            </div>
                          </div>
                        </div>
                        {c.selectedSNs.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Serial Numbers</p>
                            <div className="flex flex-wrap gap-1">
                              {c.selectedSNs.map(sn => (
                                <span key={sn} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                  {sn}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || !selectedTeamId}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <ArrowUpFromLine className="w-5 h-5" />
                Proses Pengeluaran Barang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
