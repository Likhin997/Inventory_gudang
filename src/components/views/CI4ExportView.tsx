import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  FolderTree,
  FileText,
  Layers,
  Terminal,
  Database
} from 'lucide-react';
import { getCI4CodebaseFiles, CI4File } from '../../utils/ci4CodeGenerator';

export const CI4ExportView: React.FC = () => {
  const files = getCI4CodebaseFiles();
  const [selectedFile, setSelectedFile] = useState<CI4File>(files[0]);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
              CodeIgniter 4.x + PHP 8 + MariaDB
            </span>
            <span className="text-xs text-slate-500">RESTful Architecture</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-1">
            <FileCode className="h-5 w-5 text-blue-600" />
            <span>CodeIgniter 4 Backend Engine & Code Generator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            File backend CodeIgniter 4 siap pakai: Database Migration lengkap (18+ tabel), Models dengan validasi, Controller REST API transaksi atomic, dan Routes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>
          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download File ({selectedFile.name})</span>
          </button>
        </div>
      </div>

      {/* Code Browser Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: File Tree */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Struktur Direktori CI4
          </span>

          <div className="space-y-1">
            {files.map(f => {
              const isSelected = selectedFile.path === f.path;
              return (
                <button
                  key={f.path}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors flex items-start gap-2 ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <FileCode className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="overflow-hidden">
                    <p className="font-mono text-xs truncate">{f.name}</p>
                    <span className="text-[10px] text-slate-500 block truncate">{f.category}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">⚡ Perintah CLI CI4:</span>
            <code className="text-blue-700 block font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">php spark migrate</code>
            <code className="text-blue-700 block font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">php spark db:seed ISPSeeder</code>
            <code className="text-blue-700 block font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">php spark serve --port=8080</code>
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-3 rounded-lg border border-slate-200 bg-slate-900 overflow-hidden shadow-xs flex flex-col">
          {/* Header of editor */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-400 font-semibold">{selectedFile.path}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                {selectedFile.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">{selectedFile.description}</p>
          </div>

          {/* Code text block */}
          <pre className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-x-auto overflow-y-auto max-h-[600px] leading-relaxed select-all">
            {selectedFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
