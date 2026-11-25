import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  History,
  Calendar,
  Filter,
  Download,
  Printer,
  Boxes,
  Users,
  Radio,
  Cable,
  Trash2,
  ArrowRightLeft
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { exportToExcel, exportToCSV, exportPDFTable } from '../../utils/exportUtils';
import { formatDateTimeWIB } from '../../utils/dateUtils';

interface ReportsViewProps {
  initialReportType?: 'monthly' | 'team-usage' | 'movement';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  initialReportType = 'monthly'
}) => {
  const service = InventoryService.getInstance();
  const [reportType, setReportType] = useState<'monthly' | 'team-usage' | 'movement' | 'transaction-log'>(initialReportType);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Compute Monthly Stock Summary
  const transactionsInRange = service.transactions.filter(t => {
    const tDate = (t.date || '').split('T')[0];
    return tDate >= startDate && tDate <= endDate;
  });
  
  const transactionsAfterRange = service.transactions.filter(t => {
    const tDate = (t.date || '').split('T')[0];
    return tDate > endDate;
  });

  const monthlySummary = service.items.map(item => {
    const inRangeTrx = transactionsInRange.filter(t => t.itemId === item.id);
    const afterTrx = transactionsAfterRange.filter(t => t.itemId === item.id);

    let inQty = 0;
    let outQty = 0;
    let adjQty = 0;
    let endingStock = 0;
    let beginningStock = 0;

    if (item.categoryType === 'MODEM') {
      const modems = service.modemSNs.filter(m => m.itemId === item.id);
      
      let startSt = 0;
      let endSt = 0;
      let inQ = 0;
      let outQ = 0;
      let adjQ = 0;

      const getCat = (status: string) => {
        if (['AVAILABLE', 'RESERVED'].includes(status)) return 'GUDANG';
        if (['TERPASANG', 'DIPINJAM_TEKNISI', 'DISMANTLE', 'PERGANTIAN_MODEM'].includes(status)) return 'KELUAR';
        if (['RUSAK', 'HILANG', 'RETUR'].includes(status)) return 'ADJ';
        return 'GUDANG'; 
      };

      const prevDate = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0];

      modems.forEach(m => {
        const createdDate = (m.dateIn || '').split('T')[0];
        
        let startCat = 'NOT_EXIST';
        if (createdDate <= prevDate) {
          const logsToStart = (m.history || []).filter(l => (l.timestamp || '').split('T')[0] <= prevDate).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          startCat = logsToStart.length > 0 ? getCat(logsToStart[logsToStart.length - 1].toStatus) : 'GUDANG';
        }

        let endCat = 'NOT_EXIST';
        if (createdDate <= endDate) {
          const logsToEnd = (m.history || []).filter(l => (l.timestamp || '').split('T')[0] <= endDate).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          endCat = logsToEnd.length > 0 ? getCat(logsToEnd[logsToEnd.length - 1].toStatus) : 'GUDANG';
        }

        if (startCat === 'GUDANG') startSt++;
        if (endCat === 'GUDANG') endSt++;

        if (startCat !== endCat) {
          if (startCat === 'NOT_EXIST') {
            if (endCat === 'GUDANG') { inQ++; }
            if (endCat === 'KELUAR') { inQ++; outQ++; }
            if (endCat === 'ADJ') { inQ++; adjQ--; }
          } else if (startCat === 'GUDANG') {
            if (endCat === 'KELUAR') { outQ++; }
            if (endCat === 'ADJ') { adjQ--; }
          } else if (startCat === 'KELUAR') {
            if (endCat === 'GUDANG') { outQ--; }
            if (endCat === 'ADJ') { outQ--; adjQ--; }
          } else if (startCat === 'ADJ') {
            if (endCat === 'GUDANG') { adjQ++; } 
            if (endCat === 'KELUAR') { adjQ++; outQ++; }
          }
        }
      });

      beginningStock = startSt;
      endingStock = endSt;
      inQty = inQ;
      outQty = outQ;
      adjQty = adjQ;

    } else {
      // Masuk: Pembelian baru + Pengembalian
      inQty = inRangeTrx.filter(t => t.type === 'STOCK_IN' || t.type === 'RETURN').reduce((acc, curr) => acc + curr.quantity, 0);
      
      // Keluar: Semua barang yang diambil teknisi pada rentang ini (STOCK_OUT)
      // Ini sudah mencakup semua yang berstatus SISA maupun HABIS
      const rawOut = inRangeTrx.filter(t => t.type === 'STOCK_OUT').reduce((acc, curr) => acc + curr.quantity, 0);
      outQty = rawOut;
      
      adjQty = inRangeTrx.filter(t => t.type === 'ADJUSTMENT').reduce((acc, curr) => acc + (curr.stockAfter - curr.stockBefore), 0);

      // Sesuai dengan rumus sebelumnya, endingStock gudang diukur dari arus riil
      endingStock = item.currentStock;
      for (const t of afterTrx) {
        if (t.type === 'STOCK_IN' || t.type === 'RETURN') endingStock -= t.quantity;
        else if (t.type === 'STOCK_OUT') endingStock += t.quantity;
        else if (t.type === 'ADJUSTMENT') endingStock -= (t.stockAfter - t.stockBefore);
      }
      
      beginningStock = Math.max(0, endingStock - inQty + outQty - adjQty);
    }

    return {
      itemId: item.id, code: item.code, name: item.name, category: item.categoryType, unit: item.unit,
      beginningStock, inQty, outQty, adjQty, endingStock, defaultPrice: item.defaultPrice,
      totalAssetValue: endingStock * (item.defaultPrice || 0)
    };
  });
  const totalInventoryValuation = monthlySummary.reduce((acc, curr) => acc + curr.totalAssetValue, 0);


  // Group transactions by team
  // Group transactions by team
  // Group transactions by team
  const teamUsageReport = service.teams.map(team => {
    // get all technicians in this team
    const teamTechs = service.technicians.filter(t => t.teamId === team.id);
    const teamTechIds = teamTechs.map(t => t.id);
    
    // Check both individual technicians and the team ID directly
    const isTeamOrTech = (id?: string) => {
      if (!id) return false;
      return id === team.id || teamTechIds.includes(id);
    };

    const teamTrx = service.transactions.filter(t => t.type === 'STOCK_OUT' && isTeamOrTech(t.techId));
    const totalTrx = teamTrx.length;
    
    const itemsOutMap = new Map<string, {name: string, quantity: number, unit: string}>();
    
    // 1. Modems: dari yang TERPASANG
    const activeModems = service.modemSNs.filter(s => isTeamOrTech(s.assignedTechId) && s.status === 'TERPASANG');
    activeModems.forEach(modem => {
        if (!modem.itemId) return;
        if (itemsOutMap.has(modem.itemId)) {
            itemsOutMap.get(modem.itemId)!.quantity += 1;
        } else {
            const itemDef = service.items.find(i => i.id === modem.itemId);
            itemsOutMap.set(modem.itemId, {
                name: modem.itemName || (itemDef ? itemDef.name : 'Unknown Modem'),
                quantity: 1,
                unit: 'Unit'
            });
        }
    });

    // 2. Kabel: dari yang isFinished === true
    const finishedCables = service.cableUsages.filter(c => isTeamOrTech(c.techId) && c.isFinished === true);
    finishedCables.forEach(cable => {
        if (!cable.itemId) return;
        if (itemsOutMap.has(cable.itemId)) {
            itemsOutMap.get(cable.itemId)!.quantity += cable.metersUsed;
        } else {
            itemsOutMap.set(cable.itemId, {
                name: cable.itemName,
                quantity: cable.metersUsed,
                unit: 'Meter'
            });
        }
    });

    // 3. Aksesoris/Pasif/Barang Umum: dari TeamMaterials yang status HABIS
    const finishedMaterials = service.teamMaterials.filter(m => (isTeamOrTech(m.techId) || isTeamOrTech(m.teamId)) && m.status === 'HABIS');
    finishedMaterials.forEach(mat => {
        if (!mat.itemId) return;
        if (itemsOutMap.has(mat.itemId)) {
            itemsOutMap.get(mat.itemId)!.quantity += mat.quantity;
        } else {
            itemsOutMap.set(mat.itemId, {
                name: mat.itemName,
                quantity: mat.quantity,
                unit: mat.unit || 'Pcs'
            });
        }
    });

    const itemsOutArray = Array.from(itemsOutMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
      teamId: team.id,
      teamName: team.name,
      pic: team.leader || 'N/A',
      totalTrx,
      itemsOut: itemsOutArray
    };
  });

  const handleExportMonthlyExcel = () => {
    const data = monthlySummary.map((m, idx) => ({
      No: idx + 1,
      Kode: m.code,
      'Nama Barang': m.name,
      Kategori: m.category,
      Satuan: m.unit,
      'Stok Awal': m.beginningStock,
      'Stok Masuk': m.inQty,
      'Stok Keluar': m.outQty,
      'Penyesuaian (Adj)': m.adjQty,
      'Stok Akhir': m.endingStock,
      'Harga Satuan (Rp)': m.defaultPrice,
      'Total Nilai Aset (Rp)': m.totalAssetValue
    }));

    exportToExcel(`Laporan_Bulanan_Inventory_${startDate}_sd_${endDate}`, [
      { sheetName: 'Ringkasan Bulanan', data }
    ]);
  };

  const [, setTick] = useState(0);
  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Yakin ingin menghapus transaksi ini? Stok barang akan disesuaikan kembali secara otomatis.')) {
      try {
        service.deleteTransaction(id);
        setTick(t => t + 1); // trigger re-render
        alert('Transaksi berhasil dihapus.');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleExportMonthlyPDF = () => {
    const headers = ['Kode', 'Nama Barang', 'Sat', 'Awal', 'Masuk', 'Keluar', 'Adj', 'Akhir', 'Nilai Aset (Rp)'];
    const rows = monthlySummary.map(m => [
      m.code,
      m.name,
      m.unit,
      m.beginningStock,
      m.inQty,
      m.outQty,
      m.adjQty,
      m.endingStock,
      `Rp ${ (m.totalAssetValue ?? 0).toLocaleString('id-ID')}`
    ]);

    exportPDFTable({
      title: 'Laporan Mutasi & Saldo Bulanan Inventory ISP',
      subtitle: `Periode: ${startDate}_sd_${endDate} | Total Nilai Aset: Rp ${ (totalInventoryValuation ?? 0).toLocaleString('id-ID')}`,
      filename: `Laporan_Mutasi_Bulanan_${startDate}_sd_${endDate}`,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <span>Laporan & Analisis Inventory ISP</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan mutasi bulanan (Stok Awal, Masuk, Keluar, Saldo Akhir), pemakaian per team teknisi, dan audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleExportMonthlyExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportMonthlyPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        <button
          onClick={() => setReportType('monthly')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            reportType === 'monthly'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Boxes className="h-3.5 w-3.5" />
          <span>Laporan Mutasi Bulanan</span>
        </button>
        <button
          onClick={() => setReportType('team-usage')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            reportType === 'team-usage'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Pemakaian per Team</span>
        </button>
        <button
          onClick={() => setReportType('transaction-log')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            reportType === 'transaction-log'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Log Transaksi Barang</span>
        </button>
        <button
          onClick={() => setReportType('movement')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            reportType === 'movement'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Audit Trail Lengkap</span>
        </button>
      </div>

      {/* TAB 1: MONTHLY MUTATION REPORT */}
      {reportType === 'monthly' && (
        <div className="space-y-3">
          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Periode Laporan:</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-500">s/d</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Summary Asset Valuation Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Valuasi Aset Inventory</span>
              <p className="text-xl font-bold font-mono text-green-700 mt-1">
                Rp { (totalInventoryValuation ?? 0).toLocaleString('id-ID')}
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Dari {monthlySummary.length} master barang</span>
            </div>
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Transaksi Masuk</span>
              <p className="text-xl font-bold font-mono text-blue-700 mt-1">
                {service.transactions.filter(t => t.type === 'STOCK_IN').length} Transaksi
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Transaksi Keluar</span>
              <p className="text-xl font-bold font-mono text-red-700 mt-1">
                {service.transactions.filter(t => t.type === 'STOCK_OUT').length} Transaksi
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Kode SKU</th>
                    <th className="py-2.5 px-3">Nama Barang</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Stok Awal</th>
                    <th className="py-2.5 px-3 text-right text-green-700">+ Masuk</th>
                    <th className="py-2.5 px-3 text-right text-red-700">- Keluar</th>
                    <th className="py-2.5 px-3 text-right">Adj</th>
                    <th className="py-2.5 px-3 text-right font-bold text-blue-700">Stok Akhir</th>
                    <th className="py-2.5 px-3 text-right">Valuasi Nilai (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {monthlySummary.map(row => (
                    <tr key={row.itemId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{row.code}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">{row.category}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {row.beginningStock} {row.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-green-700">
                        +{row.inQty}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-red-700">
                        -{row.outQty}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {row.adjQty !== 0 ? (row.adjQty > 0 ? `+${row.adjQty}` : row.adjQty) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        {row.endingStock} {row.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        Rp { (row.totalAssetValue ?? 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Detailed Transactions List */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden mt-4">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rincian Transaksi Masuk & Keluar</h3>
              <span className="text-[10px] text-slate-500 font-bold">{transactionsInRange.length} Transaksi</span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Trx</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Barang</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3">PIC/Tujuan</th>
                    {service.currentUser?.role === 'SUPERADMIN' && (
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactionsInRange.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500 font-medium">Tidak ada transaksi pada periode ini</td></tr>
                  ) : transactionsInRange.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(trx => (
                    <tr key={trx.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono">{new Date(trx.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{trx.transactionNumber}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trx.type === 'STOCK_IN' ? 'bg-green-100 text-green-700' :
                          trx.type === 'STOCK_OUT' ? 'bg-red-100 text-red-700' :
                          trx.type === 'RETURN' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {trx.type === 'STOCK_IN' ? 'MASUK' : trx.type === 'STOCK_OUT' ? 'KELUAR' : trx.type === 'RETURN' ? 'KEMBALI' : 'ADJUST'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-slate-900 block">{trx.itemName}</span>
                        <span className="text-[10px] text-slate-500">{""}</span>
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${
                        trx.type === 'STOCK_IN' || trx.type === 'RETURN' ? 'text-green-700' : trx.type === 'STOCK_OUT' ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {trx.type === 'STOCK_IN' || trx.type === 'RETURN' ? '+' : trx.type === 'STOCK_OUT' ? '-' : ''}{trx.quantity} <span className="text-[10px] font-normal text-slate-500">{trx.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate text-[11px]">
                        {trx.techName ? `Teknisi: ${trx.techName}` : trx.supplierName ? `Suplier: ${trx.supplierName}` : trx.notes || '-'}
                      </td>
                      {service.currentUser?.role === 'SUPERADMIN' && (
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(trx.id)}
                            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM USAGE REPORT */}
      {reportType === 'team-usage' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamUsageReport.map(tech => (
              <div
                key={tech.teamId}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{tech.teamName}</h3>
                    <p className="text-xs text-slate-500">PIC Team: <strong className="text-slate-800">{tech.pic}</strong></p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                    {tech.totalTrx} Pengambilan
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-center">
                  {tech.itemsOut.length === 0 ? (
                    <div className="col-span-full py-4 text-xs text-slate-400 italic">Belum ada barang yang diambil.</div>
                  ) : (
                    tech.itemsOut.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold truncate px-1" title={item.name}>{item.name}</span>
                        <div className="mt-1">
                          <span className="text-base font-bold font-mono text-blue-700">{item.quantity}</span>
                          <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB TRANSACTION LOG */}
      {reportType === 'transaction-log' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Log Transaksi Barang (Keluar, Masuk, Kembali)</h3>
            <span className="text-xs text-slate-500">{service.transactions.length} Total Transaksi</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2">
            {service.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(trx => (
              <div key={trx.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold px-2 py-0.5 rounded ${trx.type === 'STOCK_IN' || trx.type === 'RETURN' ? 'bg-green-50 text-green-700' : trx.type === 'STOCK_OUT' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {trx.type}
                    </span>
                    <span className="font-mono text-slate-500">{trx.transactionNumber}</span>
                  </div>
                  <p className="text-slate-800 font-medium">{trx.itemName} <span className="text-slate-500 font-normal">({trx.categoryType})</span></p>
                  <p className="text-slate-600 mt-0.5">{trx.notes || '-'}</p>
                </div>
                
                <div className="text-left sm:text-right flex flex-col sm:items-end bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded border border-slate-100 sm:border-transparent mt-2 sm:mt-0">
                  <div className="flex items-center gap-2 sm:justify-end mb-1">
                    <span className={`font-mono text-base font-bold ${trx.type === 'STOCK_IN' || trx.type === 'RETURN' || (trx.type === 'ADJUSTMENT' && trx.stockAfter > trx.stockBefore) ? 'text-green-600' : 'text-red-600'}`}>
                      {trx.type === 'STOCK_IN' || trx.type === 'RETURN' || (trx.type === 'ADJUSTMENT' && trx.stockAfter > trx.stockBefore) ? '+' : '-'}{trx.quantity}
                    </span>
                    <span className="text-slate-500">{trx.unit}</span>
                  </div>
                  <span className="text-[11px] text-slate-600">Oleh: <span className="font-semibold">{trx.performedBy}</span></span>
                  {trx.teamName && (
                    <span className="text-[11px] text-slate-600">Team: <span className="font-semibold text-purple-700">{trx.teamName}</span></span>
                  )}
                  {trx.customerName && (
                    <span className="text-[11px] text-slate-600">Pelanggan: <span className="font-semibold text-amber-700">{trx.customerName}</span></span>
                  )}
                  {trx.techName && !trx.teamName && (
                     <span className="text-[11px] text-slate-600">Teknisi: <span className="font-semibold text-blue-700">{trx.techName}</span></span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatDateTimeWIB(trx.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL / LOG AKTIVITAS */}
      {reportType === 'movement' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Log Aktivitas & Audit Trail Seluruh Sistem</h3>
              <span className="text-[10px] text-blue-600 font-mono font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                Zona Waktu: Asia/Jakarta (WIB)
              </span>
            </div>
            <span className="text-xs text-slate-500">{service.auditLogs.length} Total Rekaman</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {service.auditLogs.map(log => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-blue-700">{log.action}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                      {log.entity} #{log.entityId}
                    </span>
                  </div>
                  <p className="text-slate-800 mt-0.5">{log.details}</p>
                </div>
                <div className="text-right sm:self-center">
                  <span className="text-slate-600 block text-[11px]">Oleh: {log.userName} ({log.role})</span>
                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                    {formatDateTimeWIB(log.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
