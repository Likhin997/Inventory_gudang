import React, { useState, useEffect } from 'react';
import {
  Search,
  Radio,
  Cable,
  Package,
  ArrowRight,
  History,
  Users,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Item, ModemSerialNumber } from '../../types/inventory';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  onSelectItem?: (item: Item) => void;
  onSelectSN?: (sn: ModemSerialNumber) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectItem,
  onSelectSN
}) => {
  if (!isOpen) return null;

  const service = InventoryService.getInstance();
  const [query, setQuery] = useState('');

  const q = (query || '').trim().toLowerCase();

  const matchedItems = q
    ? service.items.filter(
        i =>
          (i.name || '').toLowerCase().includes(q) ||
          (i.code || '').toLowerCase().includes(q) ||
          (i.brand || '').toLowerCase().includes(q)
      )
    : [];

  const matchedSNs = q
    ? service.modemSNs.filter(
        s =>
          (s.serialNumber || '').toLowerCase().includes(q) ||
          (s.macAddress || '').toLowerCase().includes(q) ||
          (s.customerName || '').toLowerCase().includes(q)
      )
    : [];

  const matchedTransactions = q
    ? service.transactions.filter(
        t =>
          (t.invoiceNumber || '').toLowerCase().includes(q) ||
          (t.itemName || '').toLowerCase().includes(q) ||
          (t.project || '').toLowerCase().includes(q) ||
          (t.supplierName || '').toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-200 bg-slate-50">
          <Search className="h-4 w-4 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Cari Serial Number, MAC, SKU, Proyek, Invoice, atau Teknisi..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-900 text-xs focus:outline-none placeholder-slate-400 font-medium"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-500 font-mono">
            ESC
          </kbd>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1">
            ✕
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {!q && (
            <div className="py-10 text-center text-slate-400 text-xs space-y-1.5">
              <Search className="h-6 w-6 mx-auto text-slate-300" />
              <p className="text-slate-600 font-medium">Ketik kata kunci untuk mencari di seluruh database inventory.</p>
              <div className="flex justify-center gap-2 text-[11px] text-slate-500">
                <span>Contoh:</span>
                <button onClick={() => setQuery('HG8245H')} className="text-blue-600 hover:underline">HG8245H</button>
                <span>•</span>
                <button onClick={() => setQuery('Dropcore')} className="text-blue-600 hover:underline">Dropcore</button>
                <span>•</span>
                <button onClick={() => setQuery('F609')} className="text-blue-600 hover:underline">F609</button>
              </div>
            </div>
          )}

          {/* Master Items Results */}
          {matchedItems.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Master Barang ({matchedItems.length})
              </span>
              <div className="space-y-1">
                {matchedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelectItem) onSelectItem(item);
                      onNavigateTab('inventory-all');
                      onClose();
                    }}
                    className="p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                        {(item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE') ? <Radio className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-slate-900">{item.name}</p>
                        <span className="font-mono text-[10px] text-blue-700">{item.code} • {item.brand}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-slate-900">{item.currentStock} {item.unit}</span>
                      <span className="text-[10px] text-slate-500 block">{item.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modem SNs Results */}
          {matchedSNs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Serial Number Modem ONT ({matchedSNs.length})
              </span>
              <div className="space-y-1">
                {matchedSNs.map(sn => (
                  <div
                    key={sn.id}
                    onClick={() => {
                      if (onSelectSN) onSelectSN(sn);
                      onNavigateTab('modems');
                      onClose();
                    }}
                    className="p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-700">{sn.serialNumber}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {sn.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sn.itemName} • MAC: {sn.macAddress || '-'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      {sn.customerName ? (
                        <span className="text-green-700 font-semibold">{sn.customerName}</span>
                      ) : (
                        <span>Lokasi: {sn.location}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Results */}
          {matchedTransactions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Transaksi Mutasi ({matchedTransactions.length})
              </span>
              <div className="space-y-1">
                {matchedTransactions.map(trx => (
                  <div
                    key={trx.id}
                    onClick={() => {
                      onNavigateTab('reports-movement');
                      onClose();
                    }}
                    className="p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{trx.invoiceNumber}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${trx.type === 'STOCK_IN' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
                          {trx.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{trx.itemName} ({trx.quantity} {trx.unit})</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{trx.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q && matchedItems.length === 0 && matchedSNs.length === 0 && matchedTransactions.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Tidak ada hasil yang cocok dengan pencarian "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
