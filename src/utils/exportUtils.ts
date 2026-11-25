import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export function exportToExcel(filename: string, sheets: { sheetName: string; data: any[] }[]) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(s => {
    const ws = XLSX.utils.json_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.sheetName.slice(0, 31));
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(filename: string, data: any[]) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDFTable(params: {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  footerText?: string;
}) {
  const doc = new jsPDF('landscape');

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(params.title, 14, 15);

  if (params.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(params.subtitle, 14, 22);
  }

  // AutoTable
  autoTable(doc, {
    startY: params.subtitle ? 26 : 20,
    head: [params.headers],
    body: params.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 20, left: 14, right: 14, bottom: 15 }
  });

  // Footer text / Page info
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ISP NetStock Pro • Dicetak pada ${new Date().toLocaleString('id-ID')} • Halaman ${i} dari ${totalPages}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`${params.filename}.pdf`);
}

export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}
