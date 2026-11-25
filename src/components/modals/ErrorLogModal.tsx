import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Terminal, 
  X, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  Radio, 
  Database, 
  Activity, 
  CheckCircle2, 
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { logger, AppLogEntry } from '../../utils/logger';
import { InventoryService } from '../../services/storageService';

interface ErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'logs' | 'modems' | 'api';
  onNavigateTab?: (tabId: string, itemPayload?: any, snPayload?: any) => void;
}

export const ErrorLogModal: React.FC<ErrorLogModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'logs',
  onNavigateTab
}) => {
  const service = InventoryService.getInstance();
  const [activeTab, setActiveTab] = useState<'logs' | 'modems' | 'api'>(defaultTab);
  const [logs, setLogs] = useState<AppLogEntry[]>(logger.getLogs());
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [modemSearchQuery, setModemSearchQuery] = useState('');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    return logger.subscribe(() => {
      setLogs(logger.getLogs());
    });
  }, []);

  const handleCopyLogs = () => {
    const text = logs.map(l => 
      `[${l.timestampWIB}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}\n${l.stack ? `Stack: ${l.stack}\n` : ''}`
    ).join('\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    if (confirm('Yakin ingin membersihkan semua riwayat log error?')) {
      logger.clearLogs();
    }
  };

  const handleTriggerTestError = () => {
    logger.addLog(
      'error',
      'Test:ManualTrigger',
      'Ini adalah uji simulasi error untuk memverifikasi sistem log diagnostik aktif.',
      { user: service.currentUser?.name, time: new Date().toISOString() },
      'Error: Uji coba log error manual\n    at handleTriggerTestError (ErrorLogModal.tsx:64)'
    );
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await service.syncFromApi();
      logger.addLog('info', 'API:ForceSync', 'Sinkronisasi manual berhasil dijalankan.');
    } catch (err: any) {
      logger.addLog('error', 'API:ForceSyncFailed', err.message, err, err.stack);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestApi = async () => {
    setApiTesting(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/sync');
      const timeMs = Math.round(performance.now() - start);
      const data = await res.json();
      setApiTestResult({
        status: res.status,
        ok: res.ok,
        timeMs,
        itemsCount: data.items?.length || 0,
        modemsCount: data.modemSns?.length || 0,
        dataSizeKb: Math.round(JSON.stringify(data).length / 1024),
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
      logger.addLog('info', 'API:TestSuccess', `GET /api/sync sukses dalam ${timeMs}ms (${data.modemSns?.length || 0} modem SNs).`);
    } catch (err: any) {
      const timeMs = Math.round(performance.now() - start);
      setApiTestResult({
        status: 'FAILED',
        ok: false,
        timeMs,
        error: err.message,
        timestamp: new Date().toLocaleTimeString('id-ID')
      });
      logger.addLog('error', 'API:TestFailed', err.message, err, err.stack);
    } finally {
      setApiTesting(false);
    }
  };

  if (!isOpen) return null;

  const errorLogs = logs.filter(l => l.level === 'error');
  const warnLogs = logs.filter(l => l.level === 'warn');
  const availableSNs = (service.modemSNs || []).filter(s => s.status === 'AVAILABLE');
  const borrowedSNs = (service.modemSNs || []).filter(s => s.status === 'DIPINJAM_TEKNISI');
  const installedSNs = (service.modemSNs || []).filter(s => s.status === 'TERPASANG');
  const brokenSNs = (service.modemSNs || []).filter(s => s.status === 'RUSAK');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${errorLogs.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Log Error & Diagnostik Sistem</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  errorLogs.length > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
                }`}>
                  {errorLogs.length > 0 ? `${errorLogs.length} ERROR` : 'SYSTEM OK'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan real-time ketersediaan Serial Number modem, koneksi database, dan log galat aplikasi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Modem SN</span>
            <strong className="text-slate-900 text-sm">{service.modemSNs.length} unit</strong>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-emerald-600 block uppercase font-bold">SN AVAILABLE</span>
            <strong className="text-emerald-700 text-sm">{availableSNs.length} unit</strong>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-amber-600 block uppercase font-bold">SN DIPINJAM</span>
            <strong className="text-amber-700 text-sm">{borrowedSNs.length} unit</strong>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-red-600 block uppercase font-bold">Log Error</span>
            <strong className="text-red-700 text-sm">{errorLogs.length} kejadian</strong>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Riwayat Log Error ({logs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('modems')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'modems'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Diagnostik Serial Number ({availableSNs.length} Avail)</span>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Koneksi API & Database</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-50 space-y-4">
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-600">
                  Semua error JavaScript, kegagalan jaringan API, dan peringatan sistem dicatat otomatis di sini.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerTestError}
                    className="px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    title="Uji coba memicu log error"
                  >
                    Uji Pemicu Error
                  </button>
                  <button
                    onClick={handleCopyLogs}
                    disabled={logs.length === 0}
                    className="px-2.5 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin!' : 'Salin Semua Log'}</span>
                  </button>
                  <button
                    onClick={handleClearLogs}
                    disabled={logs.length === 0}
                    className="px-2.5 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan</span>
                  </button>
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Log Error Terdeteksi</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Aplikasi berjalan normal tanpa error uncaught. Jika Serial Number tidak muncul di halaman pengeluaran barang, periksa tab "Diagnostik Serial Number".
                  </p>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {logs.map(log => {
                    const isExpanded = expandedLogId === log.id;
                    const isError = log.level === 'error';
                    return (
                      <div 
                        key={log.id} 
                        className={`rounded-lg border p-3 bg-white shadow-2xs transition-all ${
                          isError ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isError ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                            }`}>
                              {log.level.toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-[11px]">{log.source}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{log.timestampWIB}</span>
                              </div>
                              <p className="text-slate-800 font-sans text-xs mt-0.5 break-all">
                                {log.message}
                              </p>
                            </div>
                          </div>

                          {log.stack && (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 shrink-0 font-sans"
                            >
                              <span>{isExpanded ? 'Tutup Stack' : 'Lihat Stack'}</span>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && log.stack && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 bg-slate-900 text-slate-200 p-2.5 rounded overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{log.stack}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'modems' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Status Master Modem & SN di Memori</h3>
                    <p className="text-xs text-slate-500">
                      Total unit modem yang berhasil terbaca dari server backend dan siap diproses:
                    </p>
                  </div>
                  <button
                    onClick={handleForceSync}
                    disabled={syncing}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Ulang'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-100">
                    <span className="text-[10px] text-slate-500 block font-bold">TOTAL UNIT</span>
                    <strong className="text-base text-slate-800">{service.modemSNs.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="text-[10px] block font-bold">AVAILABLE</span>
                    <strong className="text-base">{availableSNs.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="text-[10px] block font-bold">DIPINJAM</span>
                    <strong className="text-base">{borrowedSNs.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="text-[10px] block font-bold">TERPASANG</span>
                    <strong className="text-base">{installedSNs.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-800 border border-red-200">
                    <span className="text-[10px] block font-bold">RUSAK</span>
                    <strong className="text-base">{brokenSNs.length}</strong>
                  </div>
                </div>
              </div>

              {/* Items Table with Linked SNs */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Daftar Master Barang Modem & Ketersediaan SN
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Item ID</th>
                        <th className="py-2 px-3">Nama Barang</th>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3 text-center">Stok Master</th>
                        <th className="py-2 px-3 text-center">Total SN</th>
                        <th className="py-2 px-3 text-center">SN Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {service.items.map(item => {
                        const totalSNsForItem = service.modemSNs.filter(s => s.itemId === item.id || s.itemName === item.name).length;
                        const availSNsForItem = service.modemSNs.filter(s => (s.itemId === item.id || s.itemName === item.name) && s.status === 'AVAILABLE').length;
                        const isModem = item.categoryType === 'MODEM' || item.categoryType === 'DISMANTLE' || item.name.toUpperCase().includes('ONT') || item.name.toUpperCase().includes('MODEM');
                        
                        return (
                          <tr key={item.id} className={isModem ? 'bg-blue-50/30' : ''}>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{item.id}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {item.name}
                              {isModem && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 font-bold">MODEM</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{item.categoryType || '-'}</td>
                            <td className="py-2 px-3 text-center font-bold">{item.currentStock} {item.unit}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{totalSNsForItem}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{availSNsForItem}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Available & Searched SNs list */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pencarian & Uji Serial Number di Database:</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Cari SN apa pun untuk cek status dan langsung keluarkan ke teknisi.
                    </span>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        const modemItem = service.items.find(i => i.categoryType === 'MODEM' || i.name.includes('ONT'));
                        onNavigateTab('stock-out', modemItem || service.items[0]);
                        onClose();
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Buka Form Barang Keluar →
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={modemSearchQuery}
                    onChange={(e) => setModemSearchQuery(e.target.value)}
                    placeholder="Ketik Serial Number atau nama modem untuk dicari..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  {modemSearchQuery && (
                    <button
                      onClick={() => setModemSearchQuery('')}
                      className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>

                {(() => {
                  const query = modemSearchQuery.trim().toLowerCase();
                  const displayedList = query 
                    ? (service.modemSNs || []).filter(s => 
                        (s.serialNumber || '').toLowerCase().includes(query) ||
                        (s.itemName || '').toLowerCase().includes(query) ||
                        (s.batchNumber || '').toLowerCase().includes(query)
                      )
                    : availableSNs.slice(0, 15);

                  if (displayedList.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                        Tidak ada Serial Number yang cocok dengan "{modemSearchQuery}".
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                      {displayedList.map((sn) => {
                        const itm = service.items.find(i => i.id === sn.itemId || (sn.itemName && i.name.toLowerCase() === sn.itemName.toLowerCase()));
                        const isAvail = sn.status === 'AVAILABLE';
                        return (
                          <div 
                            key={sn.id} 
                            className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                              isAvail ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/50 border-amber-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate text-[11px] text-blue-900">{sn.serialNumber}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                  isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {sn.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans truncate mt-0.5">
                                {sn.itemName} {sn.brand ? `(${sn.brand})` : ''}
                              </div>
                              {sn.assignedTechName && (
                                <div className="text-[9px] text-purple-700 font-sans truncate">
                                  Teknisi: {sn.assignedTechName}
                                </div>
                              )}
                            </div>

                            {isAvail && onNavigateTab && (
                              <button
                                onClick={() => {
                                  onNavigateTab('stock-out', itm, sn);
                                  onClose();
                                }}
                                className="mt-1 w-full text-center py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-sans font-bold transition-colors cursor-pointer"
                              >
                                Keluarkan SN Ini →
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Uji Konektivitas API (/api/sync)</h3>
                    <p className="text-xs text-slate-500">
                      Lakukan pengujian langsung ke endpoint sinkronisasi backend Express & PostgreSQL:
                    </p>
                  </div>
                  <button
                    onClick={handleTestApi}
                    disabled={apiTesting}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${apiTesting ? 'animate-spin' : ''}`} />
                    <span>{apiTesting ? 'Menguji API...' : 'Uji Endpoint Sekarang'}</span>
                  </button>
                </div>

                {apiTestResult && (
                  <div className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                    apiTestResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>Status: {apiTestResult.status} ({apiTestResult.ok ? 'OK' : 'FAIL'})</span>
                      <span className="font-sans font-normal text-[11px]">Waktu: {apiTestResult.timestamp}</span>
                    </div>
                    <p>Latensi Respons: {apiTestResult.timeMs} ms</p>
                    {apiTestResult.ok && (
                      <>
                        <p>Jumlah Items dari DB: {apiTestResult.itemsCount} baris</p>
                        <p>Jumlah Modem SN dari DB: {apiTestResult.modemsCount} baris</p>
                        <p>Ukuran Payload: ~{apiTestResult.dataSizeKb} KB</p>
                      </>
                    )}
                    {apiTestResult.error && (
                      <p className="text-red-700 font-bold">Error: {apiTestResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs">
          <span className="text-slate-500">
            ISP Inventory System • Asia/Jakarta (WIB)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export const FloatingDiagnosticButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const service = InventoryService.getInstance();
  const [logs, setLogs] = useState<AppLogEntry[]>(logger.getLogs());

  useEffect(() => {
    return logger.subscribe(() => {
      setLogs(logger.getLogs());
    });
  }, []);

  const errorCount = logs.filter(l => l.level === 'error').length;
  const availableCount = (service.modemSNs || []).filter(s => s.status === 'AVAILABLE').length;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 right-4 z-40 px-3 py-2 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold transition-all transform hover:scale-105 cursor-pointer ${
        errorCount > 0
          ? 'bg-red-600 text-white border-red-500 animate-bounce'
          : 'bg-slate-900/90 hover:bg-slate-900 text-white border-slate-700 backdrop-blur-sm'
      }`}
      title="Buka Log Error & Diagnostik Sistem"
    >
      <Terminal className="w-4 h-4 text-emerald-400" />
      <span>
        {errorCount > 0 ? `${errorCount} Error Terdeteksi` : `Diagnostik (SN: ${availableCount} Avail)`}
      </span>
      {errorCount > 0 && (
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
      )}
    </button>
  );
};
