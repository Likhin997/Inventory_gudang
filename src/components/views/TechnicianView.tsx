import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Users,
  Plus, 
  Trash2, 
  Edit,
  Search,
  CheckCircle2,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { InventoryService } from '../../services/storageService';
import { Technician, Team } from '../../types/inventory';

export const TechnicianView: React.FC = () => {
  const service = InventoryService.getInstance();
  
  const [activeTab, setActiveTab] = useState<'technicians' | 'teams'>('technicians');

  // Tech state
  const [showTechModal, setShowTechModal] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techForm, setTechForm] = useState({
    nik: '',
    name: '',
    phone: '',
    email: '',
    teamId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [techSearch, setTechSearch] = useState('');

  // Team state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    leader: '',
    description: '',
    isActive: true,
    members: [] as string[]
  });
  const [teamSearch, setTeamSearch] = useState('');

  // -- COMPUTED --
  const filteredTechs = useMemo(() => {
    let result = service.technicians;
    if (techSearch) {
      const q = techSearch.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.nik.toLowerCase().includes(q)
      );
    }
    return result;
  }, [service.technicians, techSearch]);

  const filteredTeams = useMemo(() => {
    let result = service.teams || [];
    if (teamSearch) {
      const q = teamSearch.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.leader.toLowerCase().includes(q)
      );
    }
    return result;
  }, [service.teams, teamSearch]);

  // -- TECH METHODS --
  const handleEditTech = (tech: Technician) => {
    setEditingTechId(tech.id);
    setTechForm({
      nik: tech.nik,
      name: tech.name,
      phone: tech.phone,
      email: tech.email || '',
      teamId: tech.teamId || '',
      status: tech.status
    });
    setShowTechModal(true);
  };

  const handleSaveTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTechId) {
      service.updateTechnician(editingTechId, techForm);
    } else {
      service.addTechnician(techForm);
    }
    setShowTechModal(false);
    setEditingTechId(null);
  };

  const handleDeleteTech = (id: string) => {
    if (window.confirm('Yakin ingin menghapus teknisi ini?')) {
      service.deleteTechnician(id);
    }
  };

  // -- TEAM METHODS --
  const handleEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name,
      leader: team.leader,
      description: team.description || '',
      isActive: team.isActive,
      members: service.technicians.filter(t => t.teamId === team.id).map(t => t.id)
    });
    setShowTeamModal(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const savedTeamId = editingTeamId || `team-${Date.now()}`;
    if (editingTeamId) {
      service.updateTeam(savedTeamId, { ...teamForm });
    } else {
      service.addTeam({
        id: savedTeamId,
        ...teamForm
      });
    }

    const oldMembers = service.technicians.filter(t => t.teamId === savedTeamId);
    oldMembers.forEach(t => {
       if (!teamForm.members.includes(t.id)) {
           service.updateTechnician(t.id, { teamId: '' });
       }
    });

    teamForm.members.forEach(tid => {
       const t = service.technicians.find(tech => tech.id === tid);
       if (t && t.teamId !== savedTeamId) {
           service.updateTechnician(tid, { teamId: savedTeamId });
       }
    });

    setShowTeamModal(false);
    setEditingTeamId(null);
  };

  const handleDeleteTeam = (id: string) => {
    if (window.confirm('Yakin ingin menghapus tim ini?')) {
      service.deleteTeam(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-600" />
            Teknisi & Tim
          </h2>
          <p className="text-sm text-slate-500">Kelola data teknisi dan regu operasional di lapangan.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('technicians')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'technicians'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Teknisi
          </div>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'teams'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Manajemen Tim
          </div>
        </button>
      </div>

      {/* TAB: TECHNICIANS */}
      {activeTab === 'technicians' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari teknisi..."
                value={techSearch}
                onChange={e => setTechSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            </div>
            <button
              onClick={() => {
                setEditingTechId(null);
                setTechForm({ nik: '', name: '', phone: '', email: '', teamId: '', status: 'ACTIVE' });
                setShowTechModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Tambah Teknisi
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Teknisi</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Tim</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTechs.map(tech => (
                  <tr key={tech.id} className="hover:bg-slate-50">

                    <td className="px-4 py-3 font-medium text-slate-900">{tech.name}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{tech.phone}</div>
                      <div className="text-xs text-slate-400">{tech.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {service.teams?.find(t => t.id === tech.teamId)?.name || <span className="text-slate-400 italic">Tanpa Tim</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tech.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tech.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditTech(tech)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteTech(tech.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTechs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Belum ada data teknisi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: TEAMS */}
      {activeTab === 'teams' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari tim..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            </div>
            <button
              onClick={() => {
                setEditingTeamId(null);
                setTeamForm({ name: '', leader: '', description: '', isActive: true, members: [] });
                setShowTeamModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Tambah Tim
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map(team => {
              const members = service.technicians.filter(t => t.teamId === team.id);
              return (
                <div key={team.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900">{team.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditTeam(team)} className="text-slate-400 hover:text-blue-600 p-1">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{team.description || 'Tidak ada deskripsi'}</p>
                  
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Leader:</span>
                      <span className="font-medium text-slate-900 text-xs">{team.leader}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Status:</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${team.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {team.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Anggota ({members.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => (
                        <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                          {m.name}
                        </span>
                      ))}
                      {members.length === 0 && <span className="text-xs text-slate-400 italic">Belum ada anggota</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingTechId ? 'Edit Teknisi' : 'Tambah Teknisi Baru'}
              </h3>
              <button onClick={() => setShowTechModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTech} className="p-4 space-y-3">

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Teknisi *</label>
                <input
                  required
                  type="text"
                  value={techForm.name}
                  onChange={e => setTechForm({ ...techForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. HP *</label>
                <input
                  required
                  type="text"
                  value={techForm.phone}
                  onChange={e => setTechForm({ ...techForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={techForm.email}
                  onChange={e => setTechForm({ ...techForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={techForm.status}
                  onChange={e => setTechForm({ ...techForm, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="ACTIVE">Aktif (Bertugas)</option>
                  <option value="INACTIVE">Nonaktif / Resign</option>
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTechModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded hover:bg-blue-700"
                >
                  Simpan Teknisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingTeamId ? 'Edit Tim' : 'Tambah Tim Baru'}
              </h3>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeam} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Tim *</label>
                <input
                  required
                  type="text"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Tim Alpha, Maintenance 1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Ketua (Leader) *</label>
                <select
                  required
                  disabled={service.currentUser?.role !== 'SUPERADMIN'}
                  value={teamForm.leader}
                  onChange={e => setTeamForm({ ...teamForm, leader: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">-- Pilih Leader --</option>
                  {service.technicians.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                {service.currentUser?.role !== 'SUPERADMIN' && (
                  <p className="text-[10px] text-amber-600 mt-1">Hanya Superadmin yang dapat mengubah leader.</p>
                )}
              </div>
              <div className="border border-slate-200 rounded p-2">
                <label className="block text-xs font-medium text-slate-700 mb-2">Anggota Tim (Teknisi)</label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {service.technicians.map(tech => (
                    <label key={tech.id} className="flex items-center gap-2 text-sm text-slate-700 p-1 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={teamForm.members.includes(tech.id)}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          setTeamForm(prev => ({
                            ...prev,
                            members: isChecked 
                              ? [...prev.members, tech.id] 
                              : prev.members.filter(id => id !== tech.id)
                          }));
                        }}
                        className="rounded text-blue-600"
                      />
                      {tech.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi / Area</label>
                <textarea
                  value={teamForm.description}
                  onChange={e => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={teamForm.isActive}
                    onChange={e => setTeamForm({ ...teamForm, isActive: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  Tim Aktif
                </label>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded hover:bg-blue-700"
                >
                  Simpan Tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
