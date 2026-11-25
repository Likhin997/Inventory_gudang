import React, { useState } from 'react';
import {
  QrCode,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  ArrowRight
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { ModemSerialNumber } from '../../types/inventory';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSN?: (sn: ModemSerialNumber) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectSN
}) => {
  if (!isOpen) return null;

  const service = InventoryService.getInstance();
  const [manualCode, setManualCode] = useState('');
  const [scannedSN, setScannedSN] = useState<ModemSerialNumber | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const sampleSNs = service.modemSNs.slice(0, 5);

  const handleScanCode = (code: string) => {
    setIsScanning(true);
    setNotFound(false);
    setScannedSN(null);

    setTimeout(() => {
      setIsScanning(false);
      const found = service.modemSNs.find(
        s =>
          (s.serialNumber || '').toLowerCase() === (code || '').trim().toLowerCase() ||
          (s.macAddress || '').toLowerCase() === (code || '').trim().toLowerCase()
      );

      if (found) {
        setScannedSN(found);
      } else {
        setNotFound(true);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scanner Barcode / QR Serial Number</h3>
              <p className="text-xs text-slate-500">Scan label perangkat modem ONT atau ketik SN</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Visual Simulated Camera Reticle */}
        <div className="relative aspect-video rounded-lg bg-slate-900 border-2 border-dashed border-blue-400/60 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
          <Camera className="h-8 w-8 text-blue-400/80 mb-2" />
          <p className="text-xs font-bold text-white">Kamera Scanner Aktif</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Arahkan barcode atau QR sticker fisik modem ke dalam kotak
          </p>

          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
              <span className="text-xs text-blue-400 font-mono animate-pulse">Memindai Barcode...</span>
            </div>
          )}
        </div>

        {/* Quick Test Barcode Buttons (For immediate testing) */}
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-600 block flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-600" />
            Simulasi Scan Cepat (Pilih SN Demo):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleSNs.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setManualCode(s.serialNumber);
                  handleScanCode(s.serialNumber);
                }}
                className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
              >
                {s.serialNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Barcode Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ketik SN atau MAC Address manual..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleScanCode(manualCode)}
            className="flex-1 px-3 py-1.5 rounded bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => handleScanCode(manualCode)}
            className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Cari SN
          </button>
        </div>

        {/* Result Display */}
        {scannedSN && (
          <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-bold text-xs text-slate-900">Serial Number Ditemukan</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {scannedSN.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Serial Number:</span>
                <span className="font-mono font-bold text-blue-700">{scannedSN.serialNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">MAC Address:</span>
                <span className="font-mono text-slate-800">{scannedSN.macAddress || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Model Modem:</span>
                <span className="font-semibold text-slate-800">{scannedSN.itemName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Lokasi:</span>
                <span className="text-slate-800">{scannedSN.location}</span>
              </div>
            </div>

            {scannedSN.customerName && (
              <div className="p-2 bg-white rounded border border-blue-100 text-xs">
                <span className="text-slate-500 block text-[10px]">Terpasang Pada Pelanggan:</span>
                <p className="font-semibold text-slate-900">{scannedSN.customerName}</p>
                <p className="text-[11px] text-slate-500">{scannedSN.customerAddress}</p>
              </div>
            )}

            {onSelectSN && (
              <button
                type="button"
                onClick={() => {
                  onSelectSN(scannedSN);
                  onClose();
                }}
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Buka Detail Lengkap Unit</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {notFound && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
            Serial Number "{manualCode}" tidak terdaftar di database sistem.
          </div>
        )}
      </div>
    </div>
  );
};
