import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  Plus,
  CheckCircle2,
  Lock,
  FileCode,
  Edit2,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { User, UserRole } from '../../types/inventory';

interface AdministrationViewProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({ onNavigateTab }) => {
  const service = InventoryService.getInstance();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'backup'>('users');
  
  const [usersList, setUsersList] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
      } else {
        // Fallback to local users if API fails
        setUsersList(service.users);
      }
    } catch (e) {
      setUsersList(service.users);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | string>('');
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string | number, name: string} | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'GUDANG' as UserRole,
    phone: ''
  });

  const handleOpenAdd = () => {
    setIsEditing(false);
    setUserForm({ username: '', password: '', name: '', email: '', role: 'GUDANG', phone: '' });
    setShowModalPassword(false);
    setShowAddUserModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setIsEditing(true);
    setEditingUserId(u.id);
    setUserForm({
      username: u.username || '',
      password: '', // blank password, only update if filled
      name: u.name || '',
      email: u.email || '',
      role: u.role as UserRole,
      phone: u.phone || ''
    });
    setShowModalPassword(false);
    setShowAddUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanUsername = userForm.username.trim().toLowerCase();
      if (!cleanUsername) {
        throw new Error('Username wajib diisi');
      }

      if (isEditing) {
        // 1. Simpan langsung ke Database
        const payload: any = {
          username: cleanUsername,
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          phone: userForm.phone.trim() || null
        };

        // Only send password if user explicitly typed a new password!
        if (userForm.password.trim()) {
          payload.password = userForm.password.trim();
        }

        const response = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
           throw new Error(data.error || 'Gagal mengubah user');
        }
        
        // 2. Update local state array tanpa memicu bulk sync
        const idx = service.users.findIndex(u => u.id === editingUserId || u.id === String(editingUserId));
        if (idx >= 0) {
          service.users[idx] = { ...service.users[idx], ...data };
        }

        alert(`✅ User "${cleanUsername}" berhasil diperbarui di database!`);
      } else {
        if (!userForm.password.trim()) {
          throw new Error('Password wajib diisi untuk pengguna baru!');
        }

        const payload = {
          username: cleanUsername,
          password: userForm.password.trim(),
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          phone: userForm.phone.trim() || null,
          active: true,
          avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=100`
        };

        // 1. Simpan langsung ke Database
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal membuat user');

        // 2. Update local state array dengan data asli dari database
        service.users.push(data);

        alert(`✅ User "${cleanUsername}" berhasil dibuat!\n\nKredensial Login:\nUsername: ${cleanUsername}\nPassword: ${userForm.password.trim()}`);
      }
      
      // Ambil data terbaru dari database untuk merender ulang tabel
      await fetchUsers();
      setShowAddUserModal(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = (id: string | number, name: string) => {
    setUserToDelete({ id, name });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const { id, name } = userToDelete;
    
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 404) {
        throw new Error(data.error || 'Gagal menghapus user');
      }

      // Hapus dari local storage
      service.users = service.users.filter(u => u.id !== id && u.id !== String(id));
      
      await fetchUsers();
      setUserToDelete(null);
    } catch (err: any) {
      console.error(err.message);
      setUserToDelete(null);
    }
  };

  const handleExportBackup = () => {
    const backupJson = service.exportDatabaseJSON();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_ISP_NetStock_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const content = evt.target?.result as string;
        service.importDatabaseJSON(content);
        alert('✅ Database berhasil dipulihkan dari backup JSON!');
      } catch (err: any) {
        alert(`Gagal memulihkan database: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const permissionsMatrix = [
    { module: 'Dashboard & Statistik', superAdmin: true, adminGudang: true, supervisor: true, teknisi: true },
    { module: 'Lihat Master Inventory', superAdmin: true, adminGudang: true, supervisor: true, teknisi: true },
    { module: 'Tambah / Edit Master Barang', superAdmin: true, adminGudang: true, supervisor: false, teknisi: false },
    { module: 'Transaksi Stok Masuk (Stock In)', superAdmin: true, adminGudang: true, supervisor: false, teknisi: false },
    { module: 'Transaksi Stok Keluar (Stock Out)', superAdmin: true, adminGudang: true, supervisor: true, teknisi: false },
    { module: 'Pengajuan Kebutuhan Barang', superAdmin: true, adminGudang: true, supervisor: true, teknisi: true },
    { module: 'Approval Pengajuan Barang', superAdmin: true, adminGudang: false, supervisor: true, teknisi: false },
    { module: 'Eksekusi Stock Opname', superAdmin: true, adminGudang: true, supervisor: true, teknisi: false },
    { module: 'Export Laporan Bulanan (Excel/PDF)', superAdmin: true, adminGudang: true, supervisor: true, teknisi: false },
    { module: 'Manajemen Pengguna & Hak Akses', superAdmin: true, adminGudang: false, supervisor: false, teknisi: false },
    { module: 'Audit Log & Backup Database', superAdmin: true, adminGudang: false, supervisor: false, teknisi: false }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span>Administrasi, Pengguna & Hak Akses (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen pengguna sistem, matriks otorisasi role, audit keamanan, dan backup/restore data.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Data Pengguna ({usersList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'roles'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Matriks Hak Akses Role</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'backup'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Backup & Pemulihan Data</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Peran (Role)</th>
                  <th className="py-2.5 px-3">Kontak Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="h-6 w-6 rounded-full object-cover border border-slate-200" />
                      <div>
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <span className="text-[10px] text-slate-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-blue-700 font-bold">{u.username}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{u.phone || '-'}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                        AKTIF
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            service.switchUser(u.id);
                            alert(`Beralih simulasi ke akun ${u.name} (${u.role})`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-50 hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-200 text-[11px] font-semibold transition-colors"
                        >
                          Simulasikan Akun →
                        </button>
                        
                        {service.currentUser.role === 'SUPERADMIN' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1 rounded bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Edit Pengguna"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 rounded bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE MATRIX */}
      {activeTab === 'roles' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Matriks Hak Akses Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-slate-500">Pembatasan menu dan aksi transaksi sesuai SOP ISP.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Modul / Fungsi Sistem</th>
                  <th className="py-2.5 px-3 text-center">Super Admin</th>
                  <th className="py-2.5 px-3 text-center">Admin Gudang</th>
                  <th className="py-2.5 px-3 text-center">Supervisor NOC</th>
                  <th className="py-2.5 px-3 text-center">Teknisi Lapangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {permissionsMatrix.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-800">{p.module}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-green-700 font-bold">✓ Akses Penuh</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {p.adminGudang ? <span className="text-green-700 font-bold">✓</span> : <span className="text-slate-300">✕</span>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {p.supervisor ? <span className="text-green-700 font-bold">✓</span> : <span className="text-slate-300">✕</span>}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {p.teknisi ? <span className="text-green-700 font-bold">✓</span> : <span className="text-slate-300">✕</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="h-4 w-4 text-blue-600" />
              <span>Cadangkan Database (Backup JSON)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Download seluruh snapshot database aktif termasuk master item, serial number modem, histori transaksi, dan log pemakaian.
            </p>
            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Snapshot JSON</span>
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-green-700" />
              <span>Pulihkan Database (Restore JSON)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Upload file cadangan JSON yang pernah di-download untuk memulihkan seluruh state inventory.
            </p>
            <label className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              <span>Pilih File Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {service.currentUser?.role === 'SUPERADMIN' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="h-4 w-4 text-red-600" />
              <span>Hapus Data Transaksi & Stok (Reset)</span>
            </h3>
            <p className="text-xs text-red-700">
              Menghapus seluruh riwayat transaksi, log kabel, pengajuan barang, dan mereset semua kuantitas stok barang menjadi 0. Data master (Kategori, Satuan, Teknisi, Barang) tetap dipertahankan. <strong>Aksi ini tidak dapat dibatalkan!</strong>
            </p>
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full md:w-auto px-4 flex items-center justify-center gap-1.5 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset Data Transaksi & Stok</span>
            </button>
          </div>
        )}
        </div>
      )}

      {/* MODAL RESET DATABASE */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-2 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Konfirmasi Reset Database</h3>
            </div>
            
            <p className="text-sm text-slate-700">
              Apakah Anda yakin ingin menghapus <strong>seluruh data transaksi dan mereset stok ke 0</strong>?
            </p>
            <p className="text-sm text-red-600 font-medium p-3 bg-red-50 rounded border border-red-100">
              Peringatan: Aksi ini permanen dan tidak dapat dibatalkan! Pastikan Anda sudah mengunduh Backup JSON jika masih membutuhkan data sebelumnya.
            </p>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsResetting(true);
                    const service = InventoryService.getInstance();
                    await service.clearTransactionsAndStock();
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Ya, Reset Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS PENGGUNA */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Hapus Pengguna</h3>
            <p className="text-sm text-slate-700">Yakin ingin menghapus pengguna <span className="font-bold">"{userToDelete.name}"</span>?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PENGGUNA */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{isEditing ? 'Ubah Pengguna Sistem' : 'Tambah Pengguna Sistem'}</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Username * <span className="text-[10px] text-slate-500 font-normal">(Digunakan untuk login)</span></label>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="contoh: teknisi1, stafgudang"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Otomatis diubah menjadi huruf kecil tanpa spasi.</p>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Password {isEditing ? '(Kosongkan jika tidak ingin mengubah password)' : '*'}</label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required={!isEditing}
                    placeholder={isEditing ? 'Biarkan kosong jika tetap menggunakan password lama' : 'Masukkan password baru'}
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full pl-3 pr-9 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    tabIndex={-1}
                  >
                    {showModalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Email Perusahaan *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Peran (Role) *</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="GUDANG">Admin Gudang</option>
                  <option value="ADMIN">Supervisor / NOC</option>
                  <option value="TEKNISI">Teknisi Lapangan</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={userForm.phone}
                  onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
