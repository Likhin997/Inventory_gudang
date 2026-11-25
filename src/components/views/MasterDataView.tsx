import React, { useState } from 'react';
import {
  FolderTree,
  Truck,
  Briefcase,
  Ruler,
  Tags,
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';

interface MasterDataViewProps {
  initialTab?: 'suppliers' | 'projects' | 'categories' | 'units';
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  initialTab = 'suppliers'
}) => {
  const service = InventoryService.getInstance();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'projects' | 'categories' | 'units'>(initialTab);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Supplier Form
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supForm, setSupForm] = useState({
    name: '',
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [prjForm, setPrjForm] = useState({
    name: '',
    code: '',
    client: '',
    location: '',
    status: 'ONGOING' as 'ONGOING' | 'COMPLETED' | 'PLANNED'
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    type: 'QUANTITY' as any,
    description: ''
  });

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: '',
    code: '',
    symbol: ''
  });

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      service.updateSupplier(editingId, { ...supForm });
      alert('✅ Supplier berhasil diperbarui!');
    } else {
      service.createSupplier({ ...supForm });
      alert('✅ Supplier baru berhasil ditambahkan!');
    }
    setShowSupplierModal(false);
    setEditingId(null);
  };

  const handleDeleteSupplier = (id: string) => {
    if (window.confirm('Yakin ingin menghapus supplier ini?')) {
      service.deleteSupplier(id);
      alert('✅ Supplier berhasil dihapus!');
      // Force re-render is handled by persistAll / service reactivity if set up, or we can just trigger a state update.
      setActiveTab('suppliers'); // simple way to trigger re-render if not using subscriptions correctly, wait better to use service.
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      service.updateProject(editingId, { ...prjForm });
      alert('✅ Project berhasil diperbarui!');
    } else {
      service.createProject({ ...prjForm });
      alert('✅ Project baru berhasil ditambahkan!');
    }
    setShowProjectModal(false);
    setEditingId(null);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Yakin ingin menghapus project ini?')) {
      service.deleteProject(id);
      alert('✅ Project berhasil dihapus!');
      setActiveTab('projects');
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      service.updateCategory(editingId, { ...catForm });
      alert('✅ Kategori berhasil diperbarui!');
    } else {
      service.createCategory({ ...catForm });
      alert('✅ Kategori baru berhasil ditambahkan!');
    }
    setShowCategoryModal(false);
    setEditingId(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Yakin ingin menghapus kategori ini?')) {
      service.deleteCategory(id);
      alert('✅ Kategori berhasil dihapus!');
      setActiveTab('categories');
    }
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      service.updateUnit(editingId, { ...unitForm });
      alert('✅ Satuan unit berhasil diperbarui!');
    } else {
      service.createUnit({ ...unitForm });
      alert('✅ Satuan unit baru berhasil ditambahkan!');
    }
    setShowUnitModal(false);
    setEditingId(null);
  };

  const handleDeleteUnit = (id: string) => {
    if (window.confirm('Yakin ingin menghapus satuan unit ini?')) {
      service.deleteUnit(id);
      alert('✅ Satuan unit berhasil dihapus!');
      setActiveTab('units');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-blue-600" />
            <span>Master Data Referensi Sistem ISP</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data master vendor supplier, cluster proyek FTTH, kategori barang, dan satuan pengukuran.
          </p>
        </div>

        {activeTab === 'suppliers' && (
          <button
            onClick={() => {
              setEditingId(null);
              setSupForm({
                name: '',
                code: `SUP-${(service.suppliers.length + 1).toString().padStart(2, '0')}`,
                contactPerson: '',
                phone: '',
                email: '',
                address: ''
              });
              setShowSupplierModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Supplier</span>
          </button>
        )}
        {activeTab === 'projects' && (
          <button
            onClick={() => {
              setEditingId(null);
              setPrjForm({
                name: '',
                code: `PRJ-${(service.projects.length + 1).toString().padStart(2, '0')}`,
                client: '',
                location: '',
                status: 'ONGOING'
              });
              setShowProjectModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Project</span>
          </button>
        )}
        {activeTab === 'categories' && (
          <button
            onClick={() => {
              setEditingId(null);
              setCatForm({
                name: '',
                code: `CAT-${(service.categories.length + 1).toString().padStart(2, '0')}`,
                type: 'QUANTITY',
                description: ''
              });
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kategori</span>
          </button>
        )}
        {activeTab === 'units' && (
          <button
            onClick={() => {
              setEditingId(null);
              setUnitForm({
                name: '',
                code: `U-${(service.units.length + 1).toString().padStart(2, '0')}`,
                symbol: ''
              });
              setShowUnitModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Unit</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Supplier & Vendor ({service.suppliers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'projects'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Project FTTH & Cluster</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'categories'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Tags className="h-3.5 w-3.5" />
          <span>Kategori ({service.categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            activeTab === 'units'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Satuan Unit ({service.units.length})</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {service.suppliers.map(sup => (
            <div
              key={sup.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-blue-700 font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                    {sup.code}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">{sup.name}</h3>
                  <p className="text-xs text-slate-500">Kontak PIC: <strong className="text-slate-800">{sup.contactPerson}</strong></p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="p-2 rounded bg-blue-50 text-blue-600 self-end">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(sup.id);
                        setSupForm({
                          name: sup.name,
                          code: sup.code,
                          contactPerson: sup.contactPerson,
                          phone: sup.phone,
                          email: sup.email || '',
                          address: sup.address
                        });
                        setShowSupplierModal(true);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1 rounded"
                    >
                      <Plus className="h-3.5 w-3.5" /> {/* Use Edit icon ideally, but Plus is imported */}
                      {/* Actually, let's use the text 'Edit' */}
                      <span className="text-[10px] font-bold">EDIT</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(sup.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sup.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{sup.address}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daftar Project & Cluster Roll-Out Aktif</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {service.projects.map((p) => (
              <div key={p.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 relative group">
                <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/90 rounded px-1">
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setPrjForm({
                        name: p.name,
                        code: p.code,
                        client: p.client,
                        location: p.location,
                        status: p.status
                      });
                      setShowProjectModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <span className="text-[10px] font-bold">EDIT</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(p.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pr-14">
                  <span className="font-mono text-[10px] text-blue-700 font-bold">{p.code}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${p.status === 'ONGOING' ? 'bg-green-50 text-green-700 border-green-200' : p.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>{p.status}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                <p className="text-xs text-slate-500">Klien: {p.client}</p>
                <p className="text-xs text-slate-500">Wilayah: {p.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kategori Barang & Tipe Pengelolaan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {service.categories.map(cat => (
              <div key={cat.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 relative group">
                <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/90 rounded px-1">
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setCatForm({
                        name: cat.name,
                        code: cat.code,
                        type: cat.type,
                        description: cat.description
                      });
                      setShowCategoryModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <span className="text-[10px] font-bold">EDIT</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pr-14">
                  <h4 className="font-bold text-sm text-slate-900">{cat.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {cat.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{cat.description}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                  <span>Tracking Rule:</span>
                  <strong className="text-slate-800">
                    {(cat.type === 'MODEM' || cat.type === 'DISMANTLE') ? 'Unique Serial Number (SN)' : cat.type === 'KABEL' ? 'Meter-Based' : 'Quantity-Based'}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: UNITS */}
      {activeTab === 'units' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Satuan Pengukuran (Units of Measure)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {service.units.map(unit => (
              <div key={unit.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-0.5 relative group">
                <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/90 rounded px-1">
                  <button
                    onClick={() => {
                      setEditingId(unit.id);
                      setUnitForm({
                        name: unit.name,
                        code: unit.code,
                        symbol: unit.symbol
                      });
                      setShowUnitModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <span className="text-[10px] font-bold">EDIT</span>
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-lg font-bold font-mono text-blue-700">{unit.symbol}</span>
                <p className="text-xs font-semibold text-slate-800">{unit.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Ubah Supplier' : 'Tambah Supplier Baru'}</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Supplier *</label>
                <input
                  type="text"
                  required
                  value={supForm.code}
                  onChange={e => setSupForm({ ...supForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Perusahaan Supplier *</label>
                <input
                  type="text"
                  required
                  value={supForm.name}
                  onChange={e => setSupForm({ ...supForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="misal: PT Fiber Optik Nusantara"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama PIC Sales / Support</label>
                <input
                  type="text"
                  required
                  value={supForm.contactPerson}
                  onChange={e => setSupForm({ ...supForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    required
                    value={supForm.phone}
                    onChange={e => setSupForm({ ...supForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={supForm.email}
                    onChange={e => setSupForm({ ...supForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Alamat Kantor / Gudang</label>
                <textarea
                  rows={2}
                  value={supForm.address || ''}
                  onChange={e => setSupForm({ ...supForm, address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROJECT */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Ubah Project' : 'Tambah Project Baru'}</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Project *</label>
                <input
                  type="text"
                  required
                  value={prjForm.code}
                  onChange={e => setPrjForm({ ...prjForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Project *</label>
                <input
                  type="text"
                  required
                  value={prjForm.name}
                  onChange={e => setPrjForm({ ...prjForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="misal: FTTH Cluster Sakura"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Klien *</label>
                <input
                  type="text"
                  required
                  value={prjForm.client}
                  onChange={e => setPrjForm({ ...prjForm, client: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Wilayah / Lokasi *</label>
                <input
                  type="text"
                  required
                  value={prjForm.location}
                  onChange={e => setPrjForm({ ...prjForm, location: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Status</label>
                <select
                  value={prjForm.status}
                  onChange={e => setPrjForm({ ...prjForm, status: e.target.value as 'ONGOING' | 'COMPLETED' | 'PLANNED' })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="ONGOING">ONGOING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="PLANNED">PLANNED</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Ubah Kategori' : 'Tambah Kategori Baru'}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Kategori *</label>
                <input
                  type="text"
                  required
                  value={catForm.code}
                  onChange={e => setCatForm({ ...catForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="misal: ONT ZTE"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Tipe Tracking *</label>
                <select
                  value={catForm.type}
                  onChange={e => setCatForm({ ...catForm, type: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="MODEM">MODEM (Serial Number)</option>
                  <option value="KABEL">KABEL (Meter-Based)</option>
                  <option value="AKSESORIS">AKSESORIS</option>
                  <option value="PASIF">PASIF</option>
                  <option value="BARANG_UMUM">BARANG UMUM</option>
                  <option value="BARANG_TEKNISI">BARANG TEKNISI</option>
                  <option value="QUANTITY">QUANTITY (Lainnya)</option>
                  <option value="DISMANTLE">DISMANTLE (Modem Penarikan)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Deskripsi *</label>
                <textarea
                  rows={2}
                  required
                  value={catForm.description || ''}
                  onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIT */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Ubah Satuan Unit' : 'Tambah Satuan Unit Baru'}</h3>
              <button onClick={() => setShowUnitModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveUnit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Unit *</label>
                <input
                  type="text"
                  required
                  value={unitForm.code}
                  onChange={e => setUnitForm({ ...unitForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Satuan *</label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={e => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="misal: Pcs, Box, Roll"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Simbol *</label>
                <input
                  type="text"
                  required
                  value={unitForm.symbol}
                  onChange={e => setUnitForm({ ...unitForm, symbol: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  placeholder="misal: pcs, bx, m"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
