import React, { useState } from 'react';
import {
  ClipboardList,
  CheckSquare,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  User,
  Building2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { ItemRequisition, RequisitionStatus } from '../../types/inventory';

export const RequisitionApprovalView: React.FC = () => {
  const service = InventoryService.getInstance();
  const currentUser = service.currentUser;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ItemRequisition | null>(null);

  // New Requisition Form State
  const [techId, setTechId] = useState(service.technicians[0]?.id || '');
  const [project, setProject] = useState('Cluster Melati FTTH Phase 2');
  const [notes, setNotes] = useState('Kebutuhan 5 unit ONT & 300m dropcore');
  const [reqItems, setReqItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: service.items[0]?.id || '', quantity: 2 }
  ]);

  const handleAddItemRow = () => {
    setReqItems([...reqItems, { itemId: service.items[0]?.id || '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setReqItems(reqItems.filter((_, i) => i !== index));
  };

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemsPayload = reqItems.map(ri => {
        const itm = service.items.find(i => i.id === ri.itemId);
        return {
          itemId: ri.itemId,
          itemName: itm?.name || '',
          quantity: ri.quantity,
          unit: itm?.unit || 'pcs'
        };
      });

      service.createRequisition({
              techId,
      project,
        notes,
        items: itemsPayload
      });

      alert('✅ Pengajuan barang berhasil dikirim ke Supervisor!');
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprove = (reqId: string) => {
    try {
      service.approveRequisition(reqId, 'Disetujui oleh Supervisor NOC');
      alert('✅ Pengajuan telah disetujui!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = (reqId: string) => {
    const reason = prompt('Masukkan alasan penolakan pengajuan:');
    if (reason) {
      service.rejectRequisition(reqId, reason);
      alert('❌ Pengajuan telah ditolak.');
    }
  };

  const handleDispatch = (reqId: string) => {
    if (confirm('Konfirmasi serah terima barang ke teknisi? Stok barang terkait akan dipotong otomatis.')) {
      try {
        service.dispatchRequisition(reqId);
        alert('🚀 Barang berhasil diserahkan ke teknisi dan stok terpotong!');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const statusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">PENDING APPROVAL</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">APPROVED (Siap Ambil)</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">DITOLAK</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-800 border border-green-200">SELESAI / DISPATCHED</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span>Sistem Pengajuan & Approval Barang Lapangan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Alur permohonan material oleh tim teknisi dengan persetujuan bertingkat dari Supervisor NOC / Admin Gudang.
          </p>
        </div>

        {(currentUser.role === 'TEKNISI' || currentUser.role === 'SUPERADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Pengajuan Barang</span>
          </button>
        )}
      </div>

      {/* List of Requisitions */}
      <div className="space-y-3">
        {(service.requisitions || []).map(req => (
          <div
            key={req.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {req.requisitionNumber}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{req.project}</h3>
                  <p className="text-xs text-slate-500">
                    Pemohon: <strong className="text-slate-800">{req.techName}</strong> • Tgl: {req.date}
                  </p>
                </div>
              </div>

              <div>{statusBadge(req.status)}</div>
            </div>

            {/* Requested Items Table */}
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 tracking-wider">
                Daftar Barang yang Diajukan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(req.items || []).map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-white border border-slate-200 text-xs flex justify-between">
                    <span className="text-slate-800 font-medium truncate">{item.itemName}</span>
                    <span className="font-mono font-bold text-blue-700 ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {req.notes && (
              <p className="text-xs text-slate-600 italic">
                Catatan: "{req.notes}"
              </p>
            )}

            {/* Approval Actions Bar */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="text-slate-500 text-[11px]">
                {req.approvedBy && `Disetujui oleh: ${req.approvedBy}`}
                {req.approvalNotes && ` (${req.approvalNotes})`}
              </div>

              <div className="flex items-center gap-1.5">
                {(currentUser.role === 'GUDANG' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') && (
                  <>
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-bold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Setujui (Approve)</span>
                        </button>
                      </>
                    )}

                    {req.status === 'APPROVED' && (
                      <button
                        onClick={() => handleDispatch(req.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Serahkan Barang (Dispatch & Potong Stok)</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE REQUISITION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <span>Buat Pengajuan Kebutuhan Barang Lapangan</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Pilih Team *</label>
                  
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Teknisi PIC *</label>
                  <select
                    value={techId}
                    onChange={e => setTechId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {service.technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.nik})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Proyek / Cluster *</label>
                <input
                  type="text"
                  required
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-medium">Item & Jumlah yang Dibutuhkan *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="h-3 w-3" /> Tambah Item
                  </button>
                </div>

                {reqItems.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                    <select
                      value={row.itemId}
                      onChange={e => {
                        const next = [...reqItems];
                        next[idx].itemId = e.target.value;
                        setReqItems(next);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {service.items.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={row.quantity}
                      onChange={e => {
                        const next = [...reqItems];
                        next[idx].quantity = parseFloat(e.target.value) || 1;
                        setReqItems(next);
                      }}
                      className="w-24 px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />

                    {reqItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Catatan Kebutuhan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
