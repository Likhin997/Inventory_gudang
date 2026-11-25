import React, { useState, useEffect } from 'react';
import {
  Radio,
  QrCode,
  Layers,
  Search,
  Filter,
  Plus,
  ArrowUpFromLine,
  Activity,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Truck,
  User,
  MapPin,
  Calendar,
  Eye,
  Edit,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  Trash2,
  Pencil,
  RotateCcw,
  Terminal,
  ArrowRightLeft
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { ModemSerialNumber, ModemStatus, ItemBatch } from '../../types/inventory';
import { StockTransferModal } from '../modals/StockTransferModal';
import { generateQRCodeDataURL, exportToExcel, exportPDFTable } from '../../utils/exportUtils';
import {
  formatDateTimeWIB,
  formatDateWIB,
  getDateInAsiaJakarta,
  getTodayInAsiaJakarta,
  getDaysAgoInAsiaJakarta,
  getMonthStartInAsiaJakarta,
  getMonthEndInAsiaJakarta
} from '../../utils/dateUtils';

interface ModemManagementViewProps {
  initialSubTab?: 'sn' | 'batch' | 'tracking';
  onOpenBatchIn?: () => void;
  onOpenModemOut?: (item?: any, sn?: any) => void;
  onStockIn?: () => void;
  onStockOut?: (item?: any, sn?: any) => void;
  onOpenErrorModal?: () => void;
  forcedStatus?: string;
  hideTabs?: boolean;
  disableBulkReturn?: boolean;
}

export const ModemManagementView: React.FC<ModemManagementViewProps> = ({
  initialSubTab = 'sn',
  onOpenBatchIn,
  onOpenModemOut,
  onStockIn,
  onStockOut,
  onOpenErrorModal,
  forcedStatus,
  hideTabs = false,
  disableBulkReturn = false
}) => {
  const service = InventoryService.getInstance();
  const currentUser = service.currentUser;
  const canReturnToWarehouse = currentUser.role === 'SUPERADMIN' || currentUser.role === 'GUDANG';
  const handleOpenModemStockOut = onOpenModemOut || onStockOut;

  const [activeSubTab, setActiveSubTab] = useState<'sn' | 'batch' | 'tracking'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(forcedStatus || 'ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');

  useEffect(() => {
    if (forcedStatus) {
      setStatusFilter(forcedStatus);
    }
  }, [forcedStatus]);

  // Selected SN for Detail & QR Code Modal
  const [selectedSN, setSelectedSN] = useState<ModemSerialNumber | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Master Data Modal (Add/Edit)
  const [showSNModal, setShowSNModal] = useState(false);
  const [editingSNId, setEditingSNId] = useState<string | null>(null);
  const [snForm, setSnForm] = useState({
    serialNumber: '',
    itemId: '',
    status: 'AVAILABLE' as ModemStatus,
    installationType: 'PSB' as string,
  });

  // Status Change Modal
  const [statusChangeSN, setStatusChangeSN] = useState<ModemSerialNumber | null>(null);
  const [newStatus, setNewStatus] = useState<ModemStatus>('TERPASANG');
  const [installationType, setInstallationType] = useState<string>('PSB');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [opticalPower, setOpticalPower] = useState('');
  const [odpPort, setOdpPort] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [selectedTechId, setSelectedTechId] = useState('');

  const [keteranganFilter, setKeteranganFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [selectedForReturn, setSelectedForReturn] = useState<string[]>([]);
  const [showBulkReturnConfirm, setShowBulkReturnConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceItem, setTransferSourceItem] = useState<any>(null);
  const [transferSNs, setTransferSNs] = useState<string[]>([]);

  useEffect(() => {
    if (selectedSN) {
      const qrPayload = JSON.stringify({
        sn: selectedSN.serialNumber,
        model: selectedSN.model,
        batch: selectedSN.batchNumber,
        status: selectedSN.status,
        isp: 'NusantaraNet ISP'
      });
      generateQRCodeDataURL(qrPayload).then(setQrDataUrl);
    }
  }, [selectedSN]);

  const availableTeams: { id: string; name: string; type: 'team' | 'tech' }[] = React.useMemo(() => {
    const list: { id: string; name: string; type: 'team' | 'tech' }[] = [];
    const seen = new Set<string>();

    // 1. Teams from master teams
    for (const t of (service.teams || [])) {
      if (t.name && !seen.has(t.name.toLowerCase())) {
        seen.add(t.name.toLowerCase());
        list.push({ id: t.id, name: t.name, type: 'team' });
      }
    }

    // 2. Extra teams from modemSNs
    for (const s of (service.modemSNs || [])) {
      const tName = s.teamName || s.assignedTeamName;
      if (tName && !seen.has(tName.toLowerCase())) {
        seen.add(tName.toLowerCase());
        list.push({ id: s.teamId || s.assignedTeamId || tName, name: tName, type: 'team' });
      }
      if (s.assignedTechName && s.assignedTechName.toLowerCase().startsWith('team') && !seen.has(s.assignedTechName.toLowerCase())) {
        seen.add(s.assignedTechName.toLowerCase());
        list.push({ id: s.assignedTechId || s.assignedTechName, name: s.assignedTechName, type: 'team' });
      }
    }

    // 3. Technicians from master technicians
    for (const tech of (service.technicians || [])) {
      if (tech.name && !seen.has(tech.name.toLowerCase())) {
        seen.add(tech.name.toLowerCase());
        list.push({ id: tech.id, name: tech.name, type: 'tech' });
      }
    }

    // 4. Extra technicians from modemSNs (if not team name)
    for (const s of (service.modemSNs || [])) {
      const techName = s.assignedTechName;
      if (techName && !techName.toLowerCase().startsWith('team') && !seen.has(techName.toLowerCase())) {
        seen.add(techName.toLowerCase());
        list.push({ id: s.assignedTechId || techName, name: techName, type: 'tech' });
      }
    }

    return list;
  }, [service.teams, service.technicians, service.modemSNs]);

  const filteredSNs = service.modemSNs.filter(s => {
    const searchLower = (searchTerm || '').toLowerCase();
    const matchSearch =
      (s.serialNumber || '').toLowerCase().includes(searchLower) ||
      (s.itemName || '').toLowerCase().includes(searchLower) ||
      (s.batchNumber || '').toLowerCase().includes(searchLower) ||
      (s.customerName || '').toLowerCase().includes(searchLower) ||
      (s.assignedTechName || '').toLowerCase().includes(searchLower) ||
      (s.teamName || '').toLowerCase().includes(searchLower) ||
      (s.assignedTeamName || '').toLowerCase().includes(searchLower) ||
      (s.installationType || '').toLowerCase().includes(searchLower) ||
      (s.keterangan || '').toLowerCase().includes(searchLower) ||
      (s.location || '').toLowerCase().includes(searchLower);

    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchModel = modelFilter === 'ALL' || s.itemId === modelFilter;
    const matchKeterangan = keteranganFilter === 'ALL' ||
      (s.installationType || s.keterangan) === keteranganFilter;

    // Filter by Team / Teknisi
    const matchTeam = teamFilter === 'ALL' || (() => {
      if (teamFilter === 'UNASSIGNED') {
        return s.status === 'AVAILABLE' || (!s.teamId && !s.assignedTeamId && !s.assignedTechId);
      }
      const selectedItem = availableTeams.find(t => t.id === teamFilter || t.name.toLowerCase() === teamFilter.toLowerCase());
      const targetId = selectedItem?.id || teamFilter;
      const targetNameLower = (selectedItem?.name || teamFilter).toLowerCase();

      // Check if target is a team in service.teams
      const teamObj = (service.teams || []).find(t => t.id === targetId || t.name.toLowerCase() === targetNameLower);
      // Check if target is a tech in service.technicians
      const techObj = (service.technicians || []).find(t => t.id === targetId || t.name.toLowerCase() === targetNameLower);

      const matchingIds = new Set<string>([targetId]);
      const matchingNames = new Set<string>([targetNameLower]);

      if (teamObj) {
        matchingIds.add(teamObj.id);
        matchingNames.add(teamObj.name.toLowerCase());
        if (teamObj.leader) matchingNames.add(teamObj.leader.toLowerCase());
        (teamObj.members || []).forEach(mId => {
          matchingIds.add(mId);
          const memberTech = (service.technicians || []).find(t => t.id === mId);
          if (memberTech) matchingNames.add(memberTech.name.toLowerCase());
        });
        (service.technicians || []).filter(t => t.teamId === teamObj.id).forEach(t => {
          matchingIds.add(t.id);
          matchingNames.add(t.name.toLowerCase());
        });
      }

      if (techObj) {
        matchingIds.add(techObj.id);
        matchingNames.add(techObj.name.toLowerCase());
        if (techObj.teamId) {
          matchingIds.add(techObj.teamId);
          const t = (service.teams || []).find(tm => tm.id === techObj.teamId);
          if (t) matchingNames.add(t.name.toLowerCase());
        }
      }

      // 1. Direct ID checks
      if (s.teamId && matchingIds.has(s.teamId)) return true;
      if (s.assignedTeamId && matchingIds.has(s.assignedTeamId)) return true;
      if (s.assignedTechId && matchingIds.has(s.assignedTechId)) return true;

      // 2. Direct Name checks
      if (s.teamName && matchingNames.has(s.teamName.toLowerCase())) return true;
      if (s.assignedTeamName && matchingNames.has(s.assignedTeamName.toLowerCase())) return true;
      if (s.assignedTechName && matchingNames.has(s.assignedTechName.toLowerCase())) return true;

      // 3. Substring checks in location, assignedTechName, teamName, assignedTeamName
      for (const name of matchingNames) {
        if (!name || name.length < 2) continue;
        if (s.assignedTechName?.toLowerCase().includes(name)) return true;
        if (s.teamName?.toLowerCase().includes(name)) return true;
        if (s.assignedTeamName?.toLowerCase().includes(name)) return true;
        if (s.location?.toLowerCase().includes(name)) return true;
      }

      // 4. History logs (if a modem was handled by this team/technician)
      if (s.history && s.history.length > 0) {
        for (const log of s.history) {
          if (log.techName) {
            const lTech = log.techName.toLowerCase();
            for (const name of matchingNames) {
              if (name && lTech.includes(name)) return true;
            }
          }
          if (log.notes) {
            const lNotes = log.notes.toLowerCase();
            for (const name of matchingNames) {
              if (name && lNotes.includes(name)) return true;
            }
          }
        }
      }

      return false;
    })();

    // Filter by Tanggal (Date / Date Range in Asia/Jakarta)
    const matchDate = (() => {
      if (!startDate && !endDate) return true;
      const datesToCheck = new Set<string>();

      const addDate = (raw: string | undefined | null) => {
        if (!raw) return;
        const d = getDateInAsiaJakarta(raw);
        if (d) datesToCheck.add(d);
      };

      // 1. Explicit dates on modem
      addDate(s.dateIn);
      addDate(s.installedDate);
      addDate((s as any).createdAt);
      addDate((s as any).updatedAt);

      // 2. History timestamps
      if (s.history && s.history.length > 0) {
        s.history.forEach(h => {
          addDate(h.timestamp);
        });
      }

      // 3. Batch date
      if (s.batchId || s.batchNumber) {
        const batch = (service.batches || []).find(b => b.id === s.batchId || b.batchNumber === s.batchNumber);
        if (batch?.dateIn) addDate(batch.dateIn);
      }

      if (datesToCheck.size === 0) return false;

      for (const d of datesToCheck) {
        if (startDate && d < startDate) continue;
        if (endDate && d > endDate) continue;
        return true;
      }
      return false;
    })();

    return matchSearch && matchStatus && matchModel && matchKeterangan && matchTeam && matchDate;
  }).sort((a, b) => {
    const timeA = a.history && a.history.length > 0 ? new Date(a.history[0].timestamp).getTime() : new Date(a.dateIn || (a as any).createdAt || 0).getTime();
    const timeB = b.history && b.history.length > 0 ? new Date(b.history[0].timestamp).getTime() : new Date(b.dateIn || (b as any).createdAt || 0).getTime();
    return timeB - timeA;
  });

  const handleSaveSN = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item = service.items.find(i => i.id === snForm.itemId);
      if (!item) throw new Error("Silakan pilih model modem!");

      if (editingSNId) {
        service.updateModemSNDetails(editingSNId, {
          serialNumber: snForm.serialNumber,
          itemId: snForm.itemId,
          itemName: item.name,
          brand: item.brand,
          status: snForm.status,
          installationType: snForm.status === 'TERPASANG' ? (snForm.installationType || 'PSB') : undefined,
          keterangan: snForm.status === 'TERPASANG' ? (snForm.installationType || 'PSB') : undefined,
        });
        alert('Data Serial Number berhasil diperbarui!');
      } else {
        service.createModemSN({
          serialNumber: snForm.serialNumber,
          itemId: snForm.itemId,
          itemName: item.name,
          brand: item.brand,
          status: snForm.status,
          installationType: snForm.status === 'TERPASANG' ? (snForm.installationType || 'PSB') : undefined,
          keterangan: snForm.status === 'TERPASANG' ? (snForm.installationType || 'PSB') : undefined,
          dateIn: new Date().toISOString(),
          batchId: 'MANUAL',
          batchNumber: 'MANUAL',
          location: snForm.status === 'TERPASANG' ? 'Terpasang di Klien' : 'Gudang Utama',
          model: item.name,
          supplierName: 'MANUAL',
          price: 0,
          notes: ''
        });
        alert('Master Data Serial Number baru berhasil ditambahkan!');
      }
      setShowSNModal(false);
      setEditingSNId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSN = (id: string, sn: string) => {
    if (window.confirm(`Yakin ingin menghapus data Serial Number ${sn} ini secara permanen?`)) {
      service.deleteModemSN(id);
      // Trigger state update
      setSearchTerm(prev => prev + ' '); 
      setTimeout(() => setSearchTerm(prev => prev.trim()), 0);
    }
  };

  const modemModels = service.items.filter(i => (i.categoryType === 'MODEM' || i.categoryType === 'DISMANTLE'));

  const statusBadge = (status: ModemStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">AVAILABLE</span>;
      case 'TERPASANG':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">TERPASANG</span>;
      case 'DIPINJAM_TEKNISI':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">DIPINJAM</span>;
      case 'RUSAK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">RUSAK / KARANTINA</span>;
      case 'HILANG':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">HILANG</span>;
      case 'RESERVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700">RESERVED</span>;
      case 'PERGANTIAN_MODEM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">PERGANTIAN</span>;
      case 'DISMANTLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">DISMANTLE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeSN) return;

    try {
      if (newStatus === 'DIPINJAM_TEKNISI' && !selectedTechId) {
        alert('Silakan pilih Tim atau Teknisi penerima!');
        return;
      }

      service.updateModemSNStatus({
        serialNumber: statusChangeSN.serialNumber,
        newStatus,
        customerName: newStatus === 'TERPASANG' ? customerName : undefined,
        customerAddress: newStatus === 'TERPASANG' ? customerAddress : undefined,
        opticalPower: newStatus === 'TERPASANG' ? opticalPower : undefined,
        odpPort: newStatus === 'TERPASANG' ? odpPort : undefined,
        installationType: newStatus === 'TERPASANG' ? (installationType || 'PSB') : undefined,
        keterangan: newStatus === 'TERPASANG' ? (installationType || 'PSB') : undefined,
        notes: statusNotes,
        technicianId: (newStatus === 'PERGANTIAN_MODEM' || newStatus === 'DISMANTLE' || newStatus === 'DIPINJAM_TEKNISI') ? selectedTechId : undefined
      });
      setStatusChangeSN(null);
      setInstallationType('PSB');
      setCustomerName('');
      setCustomerAddress('');
      setOpticalPower('');
      setOdpPort('');
      setStatusNotes('');
      setSelectedTechId('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkReturnToWarehouse = () => {
    if (!canReturnToWarehouse) return;
    setShowBulkReturnConfirm(true);
  };

  const executeBulkReturn = () => {
    try {
      selectedForReturn.forEach(snId => {
        const modem = service.modemSNs.find(s => s.id === snId);
        if (modem && modem.status !== 'AVAILABLE') {
          service.updateModemSNStatus({
            serialNumber: modem.serialNumber,
            newStatus: 'AVAILABLE',
            notes: 'Dikembalikan ke gudang secara massal'
          });
        }
      });
      setSelectedForReturn([]);
      setShowBulkReturnConfirm(false);
      // Optional: replace alert with toast in future, but simple alert for now
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSelectForReturn = (snId: string) => {
    setSelectedForReturn(prev => 
      prev.includes(snId) ? prev.filter(id => id !== snId) : [...prev, snId]
    );
  };

  const handleSelectAllForReturn = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedForReturn(filteredSNs.map(s => s.id));
    } else {
      setSelectedForReturn([]);
    }
  };

  const handleExportExcel = () => {
    const data = filteredSNs.map((s, idx) => ({
      No: idx + 1,
      'Serial Number (SN)': s.serialNumber,
      'Model Modem': s.itemName,
      Batch: s.batchNumber,
      Status: s.status,
      'Keterangan': s.installationType || s.keterangan || '-',
      Lokasi: s.location,
      'Team Bertugas': s.assignedTechName || '-',
      'Teknisi PIC': s.assignedTechName || '-',
      'Nama Pelanggan': s.customerName || '-',
      'Alamat Pelanggan': s.customerAddress || '-',
      'Tgl Masuk': s.dateIn,
      'Tgl Terpasang': s.installedDate || '-'
    }));

    exportToExcel(`Daftar_Serial_Number_Modem_${new Date().toISOString().slice(0, 10)}`, [
      { sheetName: 'Serial Numbers', data }
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio className={`h-5 w-5 ${forcedStatus === 'RUSAK' ? 'text-red-600' : 'text-blue-600'}`} />
            <span>
              {forcedStatus === 'RUSAK'
                ? 'Stok Barang ONT Rusak & Karantina'
                : forcedStatus === 'TERPASANG'
                ? 'Barang Terpasang (Aktif di Pelanggan)'
                : forcedStatus === 'DIPINJAM_TEKNISI'
                ? 'Barang Dipinjam Teknisi'
                : 'Manajemen Modem / ONT & Serial Number Tracking'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {forcedStatus === 'RUSAK'
              ? 'Daftar unit modem/ONT berstatus Rusak atau Karantina (Siap RMA/Perbaikan). Otomatis terintegrasi dengan master stok barang ONT RUSAK.'
              : 'Pelacakan Serial Number unik, sistem batch FIFO masuk/keluar, dan riwayat lifecycle setiap unit.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenBatchIn && (
            <button
              onClick={onOpenBatchIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Modem Masuk Batch</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingSNId(null);
              setSnForm({ serialNumber: '', itemId: '', status: (forcedStatus as ModemStatus) || 'AVAILABLE', installationType: 'PSB' });
              setShowSNModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Master SN</span>
          </button>

          <button
            onClick={() => {
              setTransferSourceItem(null);
              setTransferSNs([]);
              setShowTransferModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Pindah Stok / Relokasi Master Modem (contoh: ONT ZTE -> ONT ZTE Pinjam Piang)"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Pindah Master Barang</span>
          </button>

          {onOpenErrorModal && (
            <button
              onClick={onOpenErrorModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Buka Log Error & Diagnostik SN"
            >
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Log Error & Diagnostik</span>
            </button>
          )}

          {handleOpenModemStockOut && (
            <button
              onClick={() => handleOpenModemStockOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Keluarkan Modem dari Gudang ke Teknisi / Tim (Stock Out)"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              <span>Pengeluaran Modem (Stock Out)</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Pills */}
      {!hideTabs && (
        <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-lg shadow-xs w-fit">
          <button
            onClick={() => setActiveSubTab('sn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeSubTab === 'sn'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Explorer Serial Number ({service.modemSNs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('batch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeSubTab === 'batch'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Sistem Batch ({service.batches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeSubTab === 'tracking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Tracking Terpasang & Pelanggan</span>
          </button>
        </div>
      )}

      {/* SUB-TAB 1: SERIAL NUMBER EXPLORER */}
      {activeSubTab === 'sn' && (
        <div className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 border border-slate-200 rounded-lg shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="sm:col-span-2 lg:col-span-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari SN, MAC, Batch, Klien, Team..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  disabled={!!forcedStatus}
                  className={`w-full px-3 py-1.5 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${forcedStatus ? 'bg-slate-100' : 'bg-white'}`}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="AVAILABLE">AVAILABLE (Gudang)</option>
                  <option value="TERPASANG">TERPASANG (Pelanggan)</option>
                  <option value="DIPINJAM_TEKNISI">DIPINJAM (Team & Teknisi)</option>
                  <option value="PERGANTIAN_MODEM">PERGANTIAN MODEM</option>
                  <option value="DISMANTLE">DISMANTLE</option>
                  <option value="RUSAK">RUSAK / KARANTINA (Siap RMA)</option>
                  <option value="HILANG">HILANG</option>
                  <option value="RESERVED">RESERVED</option>
                </select>
              </div>

              <div>
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="ALL">Semua Team & Teknisi</option>
                  <option value="UNASSIGNED">📦 Belum Di-assign (Di Gudang / Available)</option>
                  {availableTeams.filter(t => t.type === 'team').length > 0 && (
                    <optgroup label="Team">
                      {availableTeams.filter(t => t.type === 'team').map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {availableTeams.filter(t => t.type === 'tech').length > 0 && (
                    <optgroup label="Teknisi">
                      {availableTeams.filter(t => t.type === 'tech').map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <select
                  value={modelFilter}
                  onChange={e => setModelFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="ALL">Semua Tipe Modem</option>
                  {modemModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={keteranganFilter}
                  onChange={e => setKeteranganFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="ALL">Semua Keterangan</option>
                  <option value="PSB">PSB</option>
                  <option value="Pergantian Modem">Pergantian Modem</option>
                </select>
              </div>
            </div>

            {/* Date Range & Reset Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Filter Tanggal:</span>
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayInAsiaJakarta();
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getTodayInAsiaJakarta() && endDate === getTodayInAsiaJakarta()
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(getDaysAgoInAsiaJakarta(6));
                      setEndDate(getTodayInAsiaJakarta());
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getDaysAgoInAsiaJakarta(6) && endDate === getTodayInAsiaJakarta()
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(getMonthStartInAsiaJakarta());
                      setEndDate(getMonthEndInAsiaJakarta());
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === getMonthStartInAsiaJakarta() && endDate === getMonthEndInAsiaJakarta()
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2026-09-01');
                      setEndDate('2026-09-30');
                    }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      startDate === '2026-09-01' && endDate === '2026-09-30'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Bulan Lalu (Sep 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      !startDate && !endDate
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Semua Waktu
                  </button>
                </div>
              </div>

              {(searchTerm || (statusFilter !== (forcedStatus || 'ALL')) || teamFilter !== 'ALL' || modelFilter !== 'ALL' || keteranganFilter !== 'ALL' || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter(forcedStatus || 'ALL');
                    setTeamFilter('ALL');
                    setModelFilter('ALL');
                    setKeteranganFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer ml-auto transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Bulk Actions Container */}
          {selectedForReturn.length > 0 && !disableBulkReturn && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-xs animate-in fade-in slide-in-from-top-4">
              <span className="text-sm font-semibold text-blue-800">
                {selectedForReturn.length} Modem Terpilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedForReturn([])}
                  className="px-3 py-1.5 rounded bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const selectedObjects = filteredSNs.filter(s => selectedForReturn.includes(s.id));
                    const firstSN = selectedObjects[0];
                    const foundItem = firstSN ? service.items.find(i => i.id === firstSN.itemId || (firstSN.itemName && i.name.toLowerCase() === firstSN.itemName.toLowerCase())) : null;
                    setTransferSourceItem(foundItem || null);
                    setTransferSNs(selectedObjects.map(s => s.serialNumber));
                    setShowTransferModal(true);
                  }}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Pindahkan unit yang dipilih ke master barang lain"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Pindah Master ({selectedForReturn.length} SN)</span>
                </button>
                {canReturnToWarehouse && (
                  <button
                    onClick={handleBulkReturnToWarehouse}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Kembalikan ke Gudang (Bulk)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {!disableBulkReturn && (
                      <th className="py-2.5 px-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={filteredSNs.length > 0 && selectedForReturn.length === filteredSNs.length}
                          onChange={handleSelectAllForReturn}
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider whitespace-nowrap">Serial Number (SN)</th>
                    
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Model Modem</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Nomor Batch</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Status</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Keterangan</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Lokasi Saat Ini</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">PIC / Pelanggan</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSNs.length === 0 ? (
                    <tr>
                      <td colSpan={disableBulkReturn ? 9 : 10} className="py-10 text-center">
                        <div className="max-w-md mx-auto space-y-2 text-slate-500">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-800 text-sm">Tidak ada Serial Number yang cocok dengan filter aktif</p>
                          <p className="text-xs text-slate-500">
                            Total unit modem di sistem: <strong>{service.modemSNs.length} unit</strong> ({service.modemSNs.filter(s => s.status === 'AVAILABLE').length} AVAILABLE).
                          </p>
                          {(startDate || endDate || statusFilter !== 'ALL' || teamFilter !== 'ALL' || modelFilter !== 'ALL' || searchTerm) && (
                            <p className="text-[11px] text-slate-600 bg-slate-100 p-2 rounded border border-slate-200">
                              Filter aktif: {[
                                searchTerm && `Pencarian "${searchTerm}"`,
                                statusFilter !== 'ALL' && `Status: ${statusFilter}`,
                                teamFilter !== 'ALL' && `Team/Teknisi`,
                                modelFilter !== 'ALL' && `Model`,
                                (startDate || endDate) && `Tanggal: ${startDate || 'awal'} s/d ${endDate || 'akhir'}`
                              ].filter(Boolean).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm('');
                                if (!forcedStatus) setStatusFilter('ALL');
                                setModelFilter('ALL');
                                setTeamFilter('ALL');
                                setKeteranganFilter('ALL');
                                setStartDate('');
                                setEndDate('');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              Reset Semua Filter
                            </button>
                            {onOpenErrorModal && (
                              <button
                                type="button"
                                onClick={onOpenErrorModal}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                              >
                                Buka Log Error & Diagnostik
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSNs.map(sn => (
                      <tr key={sn.id} className="hover:bg-blue-50/60 transition-colors">
                        {!disableBulkReturn && (
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={selectedForReturn.includes(sn.id)}
                              onChange={() => handleToggleSelectForReturn(sn.id)}
                            />
                          </td>
                        )}
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {sn.serialNumber}
                        </td>
                        
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{sn.itemName}</p>
                          <span className="text-[10px] text-slate-500">{sn.brand}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                          {sn.batchNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          {statusBadge(sn.status)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {sn.installationType || sn.keterangan ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              (sn.installationType || sn.keterangan) === 'PSB'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            }`}>
                              {sn.installationType || sn.keterangan}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate">
                          {sn.location}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {sn.status === 'TERPASANG' && sn.customerName ? (
                            <div>
                              <p className="font-semibold text-slate-900">{sn.customerName}</p>
                              <span className="text-[10px] text-slate-500 block">
                                Terpasang: {formatDateWIB(sn.installedDate || sn.history?.[0]?.timestamp)}
                              </span>
                              {(sn.opticalPower || sn.odpPort) && (
                                <span className="text-[10px] text-blue-600 block mt-0.5">
                                  {[
                                    sn.odpPort && `Port: ${sn.odpPort}`,
                                    sn.opticalPower && `Redaman: ${sn.opticalPower} dBm`
                                  ].filter(Boolean).join(' | ')}
                                </span>
                              )}
                            </div>
                          ) : sn.status === 'DIPINJAM_TEKNISI' ? (
                            <div>
                              <p className="font-semibold text-amber-800">{sn.assignedTechName}</p>
                              {(sn.teamName || sn.assignedTeamName) ? (
                                <span className="text-[10px] text-purple-700 font-semibold block">Team: {sn.teamName || sn.assignedTeamName}</span>
                              ) : (
                                <span className="text-[10px] text-slate-500">{sn.assignedTechName}</span>
                              )}
                              {(() => {
                                const loanLog = (sn.history || []).find(h => h.toStatus === 'DIPINJAM_TEKNISI' || h.action?.toLowerCase().includes('pinjam') || h.action?.toLowerCase().includes('pengeluaran'));
                                const loanDate = loanLog?.timestamp || sn.dateIn;
                                return loanDate ? (
                                  <span className="text-[10px] text-slate-500 block">Tgl Pinjam: {formatDateWIB(loanDate)}</span>
                                ) : null;
                              })()}
                            </div>
                          ) : sn.status === 'RUSAK' ? (
                            <div>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                Karantina Rusak
                              </span>
                              {(sn.teamName || sn.assignedTeamName || sn.assignedTechName) && (
                                <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                                  Team/Teknisi: {sn.teamName || sn.assignedTeamName || sn.assignedTechName}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Tgl Rusak: {formatDateWIB(sn.history?.[0]?.timestamp || sn.dateIn)}
                              </span>
                            </div>
                          ) : (sn.customerName || sn.teamName || sn.assignedTeamName) ? (
                            <div>
                              {sn.customerName && <p className="font-semibold text-slate-800">Pelanggan: {sn.customerName}</p>}
                              {(sn.teamName || sn.assignedTeamName) && (
                                <span className="text-[10px] text-purple-700 font-semibold block">Team: {sn.teamName || sn.assignedTeamName}</span>
                              )}
                              {sn.dateIn && <span className="text-[10px] text-slate-500 block">Tgl Masuk: {formatDateWIB(sn.dateIn)}</span>}
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 text-xs block">-</span>
                              {sn.dateIn && <span className="text-[10px] text-slate-500 block">Tgl Masuk: {formatDateWIB(sn.dateIn)}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sn.status === 'AVAILABLE' && handleOpenModemStockOut && (
                              <button
                                onClick={() => {
                                  const itm = service.items.find(i => i.id === sn.itemId || (sn.itemName && i.name.toLowerCase() === sn.itemName.toLowerCase()));
                                  handleOpenModemStockOut(itm, sn);
                                }}
                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                                title="Keluarkan Modem ini ke Teknisi (Stock Out)"
                              >
                                <ArrowUpFromLine className="h-3 w-3" />
                                <span>Keluarkan</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedSN(sn)}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold"
                              title="Lihat Detail & QR Code"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Detail</span>
                            </button>

                            <button
                              onClick={() => {
                                setStatusChangeSN(sn);
                                const targetStatus = sn.status === 'DIPINJAM_TEKNISI' 
                                  ? 'TERPASANG' 
                                  : (sn.status === 'AVAILABLE' ? 'DIPINJAM_TEKNISI' : 'AVAILABLE');
                                setNewStatus(targetStatus);
                                setInstallationType(sn.installationType || sn.keterangan || 'PSB');
                                setCustomerName(sn.customerName || '');
                                setCustomerAddress(sn.customerAddress || '');
                                setOpticalPower(sn.opticalPower || '');
                                setOdpPort(sn.odpPort || '');
                                setStatusNotes(sn.notes || '');
                                setSelectedTechId(sn.assignedTechId || sn.assignedTeamId || sn.teamId || '');
                              }}
                              className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              title="Ubah Status Unit Modem"
                            >
                              <Edit className="h-3 w-3 text-amber-600" />
                              <span>Status</span>
                            </button>
                            <button
                              onClick={() => {
                                const foundItem = service.items.find(i => i.id === sn.itemId || (sn.itemName && i.name.toLowerCase() === sn.itemName.toLowerCase()));
                                setTransferSourceItem(foundItem || null);
                                setTransferSNs([sn.serialNumber]);
                                setShowTransferModal(true);
                              }}
                              className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Pindahkan SN ini ke Master Barang Lain (contoh: ONT ZTE -> ONT ZTE Pinjam Piang)"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-indigo-600" />
                              <span>Pindah</span>
                            </button>
                            {currentUser.role === 'SUPERADMIN' && (
                              <button
                                onClick={() => handleDeleteSN(sn.id, sn.serialNumber)}
                                className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 text-[11px] font-medium"
                                title="Hapus Permanen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {filteredSNs.length} Serial Number</span>
              <button onClick={handleExportExcel} className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export List ke Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BATCH SYSTEM */}
      {activeSubTab === 'batch' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {service.batches.map(batch => (
              <div
                key={batch.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                      {batch.batchNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{batch.itemName}</h3>
                    <p className="text-xs text-slate-500">Supplier: {batch.supplierName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tgl Masuk:</span>
                    <span className="font-medium text-slate-800">{batch.dateIn}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">No. Invoice:</span>
                    <span className="font-mono text-slate-800">{batch.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Unit:</span>
                    <span className="font-bold text-slate-900">{batch.quantity} Unit</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Harga Satuan:</span>
                    <span className="font-mono text-slate-800">{batch.unitPrice != null ? `Rp ${batch.unitPrice.toLocaleString('id-ID')}` : '-'}</span>
                  </div>
                </div>

                {/* Progress counts */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-green-700 font-semibold">{batch.availableCount} Available</span>
                    <span className="text-blue-700 font-semibold">{batch.installedCount} Terpasang</span>
                    <span className="text-red-700 font-semibold">{batch.brokenCount} Rusak</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(batch.availableCount / batch.quantity) * 100}%` }}
                      title="Available"
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${(batch.installedCount / batch.quantity) * 100}%` }}
                      title="Terpasang"
                    />
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${(batch.brokenCount / batch.quantity) * 100}%` }}
                      title="Rusak"
                    />
                  </div>
                </div>

                {batch.notes && (
                  <p className="text-[11px] text-slate-500 italic">"{batch.notes}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRACKING & LIFECYCLE */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Daftar Modem Terpasang di Pelanggan FTTH</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Serial Number</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Pelanggan</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Keterangan</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Alamat Lokasi</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Model ONT</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Team & Teknisi</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider">Tgl Pasang</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-slate-500 tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {service.modemSNs
                    .filter(s => s.status === 'TERPASANG')
                    .map(sn => (
                      <tr key={sn.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">{sn.serialNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{sn.customerName || 'Pelanggan FTTH'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            (sn.installationType || sn.keterangan) === 'PSB'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}>
                            {sn.installationType || sn.keterangan || 'PSB'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[220px] truncate">{sn.customerAddress || sn.location}</td>
                        <td className="py-2.5 px-3 text-slate-700">{sn.itemName}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {sn.assignedTechName} ({sn.assignedTechName})
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{sn.installedDate || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedSN(sn)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold"
                          >
                            Riwayat →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SN DETAIL & QR CODE PRINT */}
      {selectedSN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Detail Serial Number Unit</span>
                <h3 className="text-base font-bold text-slate-900 font-mono">{selectedSN.serialNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedSN(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Card & Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 items-center">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded border border-slate-200 shadow-xs">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Modem QR Code" className="h-32 w-32 object-contain" />
                )}
                <span className="text-[9px] font-mono font-bold text-slate-800 mt-1">{selectedSN.serialNumber}</span>
              </div>

              <div className="sm:col-span-2 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Model Modem:</span>
                  <span className="font-semibold text-slate-900">{selectedSN.itemName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">

                  <div>
                    <span className="text-slate-500 block text-[10px]">Batch Number:</span>
                    <span className="font-mono text-slate-800">{selectedSN.batchNumber}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Status Saat Ini:</span>
                  {statusBadge(selectedSN.status)}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Lokasi Fisik:</span>
                  <span className="text-slate-800">{selectedSN.location}</span>
                </div>
                {(selectedSN.customerName || selectedSN.status === 'TERPASANG' || selectedSN.teamName) && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Pelanggan:</span>
                      <span className="font-semibold text-slate-800">{selectedSN.customerName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Keterangan:</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (selectedSN.installationType || selectedSN.keterangan) === 'PSB'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {selectedSN.installationType || selectedSN.keterangan || (selectedSN.status === 'TERPASANG' ? 'PSB' : '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Team Lapangan / Penarik:</span>
                      <span className="font-semibold text-purple-700">{selectedSN.teamName || selectedSN.assignedTeamName || selectedSN.assignedTechName || '-'}</span>
                    </div>
                    {selectedSN.customerAddress && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Alamat Pelanggan:</span>
                        <span className="text-slate-800">{selectedSN.customerAddress}</span>
                      </div>
                    )}
                    {selectedSN.status === 'TERPASANG' && selectedSN.installedDate && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Tgl Pemasangan:</span>
                        <span className="font-mono text-slate-800">{selectedSN.installedDate}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 block text-[10px]">Detail Port & Redaman:</span>
                      <span className="text-slate-800 text-blue-700 font-medium text-[10px]">
                        {[
                          selectedSN.odpPort && `Port: ${selectedSN.odpPort}`,
                          selectedSN.opticalPower && `Redaman: ${selectedSN.opticalPower} dBm`
                        ].filter(Boolean).join(' | ') || '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Riwayat Perjalanan (Audit Trail Unit)
                </h4>
                <span className="text-[10px] text-blue-600 font-mono font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  Zona Waktu: Asia/Jakarta (WIB)
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedSN.history?.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-700">{log.action}</span>
                      <span className="text-slate-600 font-mono font-medium">
                        {formatDateTimeWIB(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1">{log.notes}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Oleh: {log.performedBy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Label QR</span>
              </button>
              <button
                onClick={() => setSelectedSN(null)}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE STATUS */}
      {statusChangeSN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Update Status Modem</h3>
                <p className="text-xs font-mono text-blue-700">{statusChangeSN.serialNumber}</p>
              </div>
              <button
                onClick={() => setStatusChangeSN(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status Baru *</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as ModemStatus)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="TERPASANG">TERPASANG (Aktif di Pelanggan)</option>
                  <option value="DIPINJAM_TEKNISI">DIPINJAM TEKNISI (Toolkit Lapangan)</option>
                  <option value="AVAILABLE">AVAILABLE (Kembali ke Gudang)</option>
                  <option value="PERGANTIAN_MODEM">PERGANTIAN MODEM</option>
                  <option value="DISMANTLE">Modem Penarikan - DISMANTLE</option>
                  <option value="RUSAK">RUSAK / KARANTINA (Siap RMA)</option>
                  <option value="HILANG">HILANG</option>
                  <option value="RETUR">RETUR KE SUPPLIER</option>
                </select>
              </div>

              {newStatus === 'TERPASANG' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Keterangan <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={installationType}
                      onChange={e => setInstallationType(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="PSB">PSB</option>
                      <option value="Pergantian Modem">Pergantian Modem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nama Pelanggan *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="misal: Bpk. Gunawan"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Alamat Pemasangan</label>
                    <textarea
                      rows={2}
                      value={customerAddress || ''}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Alamat lengkap cluster/rumah..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Redaman (dBm)</label>
                      <input
                        type="text"
                        value={opticalPower}
                        onChange={e => setOpticalPower(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="misal: -19.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Port ODP</label>
                      <input
                        type="text"
                        value={odpPort}
                        onChange={e => setOdpPort(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="misal: ODP-XYZ-01 / Port 4"
                      />
                    </div>
                  </div>
                </>
              )}

              {newStatus === 'DIPINJAM_TEKNISI' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Pilih Tim / Teknisi Penerima *
                  </label>
                  <select
                    required
                    value={selectedTechId}
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Pilih Tim atau Teknisi...</option>
                    {service.teams.length > 0 && (
                      <optgroup label="Tim (Team Lapangan)">
                        {service.teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name} (Leader: {team.leader})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {service.technicians.length > 0 && (
                      <optgroup label="Teknisi Individu">
                        {service.technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {(newStatus === 'DISMANTLE' || newStatus === 'PERGANTIAN_MODEM') && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Team & Teknisi Penarikan / Pergantian *
                  </label>
                  <select
                    required
                    value={selectedTechId}
                    onChange={e => setSelectedTechId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Pilih Team & Teknisi...</option>
                    {service.technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newStatus === 'RUSAK' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1.5 animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5 text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>Otomatis Masuk ke Stok Barang ONT Rusak</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    Unit modem ini akan langsung dialihkan ke master barang <strong>ONT RUSAK</strong> di gudang karantina (siap RMA atau perbaikan). Stok barang ONT RUSAK akan otomatis bertambah (+1).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan / Keterangan Team & Teknisi</label>
                <textarea
                  rows={2}
                  value={statusNotes || ''}
                  onChange={e => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="misal: Redaman -19 dBm, ONT online normal..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusChangeSN(null)}
                  className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Perbarui Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* MASTER DATA MODEM MODAL */}
      {showSNModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tambah Master Modem Baru</h3>
                <p className="text-xs text-slate-500">Isi data identitas modem.</p>
              </div>
              <button
                onClick={() => setShowSNModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSN} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Model / Tipe Modem *</label>
                <select
                  required
                  value={snForm.itemId}
                  onChange={e => setSnForm({...snForm, itemId: e.target.value})}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Pilih Model...</option>
                  {modemModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {m.brand}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Serial Number *</label>
                <input
                  required
                  type="text"
                  value={snForm.serialNumber}
                  onChange={e => setSnForm({...snForm, serialNumber: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Misal: ZTE12345678"
                />
              </div>



              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status Awal *</label>
                <select
                  value={snForm.status}
                  onChange={e => setSnForm({...snForm, status: e.target.value as ModemStatus})}
                  disabled={!!forcedStatus}
                  className={`w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none ${forcedStatus ? 'bg-slate-100' : 'bg-white'}`}
                >
                  <option value="AVAILABLE">AVAILABLE (Gudang)</option>
                  <option value="TERPASANG">TERPASANG (Aktif Pelanggan)</option>
                  <option value="DIPINJAM_TEKNISI">DIPINJAM TEKNISI</option>
                  <option value="PERGANTIAN_MODEM">PERGANTIAN MODEM</option>
                  <option value="DISMANTLE">DISMANTLE</option>
                  <option value="RUSAK">RUSAK / KARANTINA (Siap RMA)</option>
                  <option value="RETUR">RETUR</option>
                  <option value="HILANG">HILANG</option>
                  <option value="RESERVED">RESERVED</option>
                </select>
              </div>

              {snForm.status === 'RUSAK' && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-800">
                  <span className="font-semibold block text-red-700">Masuk ke Stok Barang ONT Rusak:</span>
                  Unit ini otomatis terdaftar di master item <strong>ONT RUSAK</strong> (Karantina Gudang).
                </div>
              )}

              {snForm.status === 'TERPASANG' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Keterangan <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={snForm.installationType || 'PSB'}
                    onChange={e => setSnForm({...snForm, installationType: e.target.value})}
                    className="w-full px-3 py-1.5 rounded border border-slate-200 text-slate-900 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="PSB">PSB</option>
                    <option value="Pergantian Modem">Pergantian Modem</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSNModal(false)}
                  className="px-4 py-1.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  Tambahkan Master SN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Return Confirm Modal */}
      {showBulkReturnConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Kembalikan ke Gudang?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Anda akan mengembalikan <strong>{selectedForReturn.length}</strong> unit modem ke Gudang Utama.
                  Statusnya akan berubah menjadi AVAILABLE.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowBulkReturnConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeBulkReturn}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Ya, Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedForReturn([]);
          }}
          initialFromItem={transferSourceItem}
          initialSNs={transferSNs}
          onSuccess={() => {
            setSelectedForReturn([]);
            setSearchTerm(prev => prev + ' ');
            setTimeout(() => setSearchTerm(prev => prev.trim()), 0);
          }}
        />
      )}
    </div>
  );
};
