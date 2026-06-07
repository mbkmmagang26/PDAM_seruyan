import React, { useState, useEffect } from 'react';
import { Settings, User, Building2, Bell, Shield, LogOut, ChevronRight, Save, Trash2, Plus, X, Loader2, Key } from 'lucide-react';
import { useAuth } from '../../../authContext';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function Pengaturan() {
  const { user, allUsers, updateUserStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'system'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (user?.role === 'pelanggan' || user?.role === 'customer') {
        await updateDoc(doc(db, 'tb_pelanggan', user!.id), {
          nama: profileData.name,
          noHp: profileData.phone,
          alamat: profileData.address
        });
      } else {
        await updateDoc(doc(db, 'user_admin', user!.id), profileData);
      }
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { title: 'Profil Diperbarui', message: 'Perubahan data profil Anda berhasil disimpan.', type: 'success' }
      }));
    } catch (err: any) {
      alert('Gagal memperbarui profil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === user?.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;
    try {
      const adminDoc = await getDoc(doc(db, 'user_admin', id));
      if (adminDoc.exists()) {
        await deleteDoc(doc(db, 'user_admin', id));
      } else {
        const targetRef = doc(db, 'tb_pelanggan', id);
        const targetSnap = await getDoc(targetRef);
        if (targetSnap.exists()) {
          const targetData = targetSnap.data();
          const customerUserId = targetData.userId;
          if (customerUserId && customerUserId !== id) {
            const parentRef = doc(db, 'tb_pelanggan', customerUserId);
            const parentSnap = await getDoc(parentRef);
            if (parentSnap.exists()) {
              const parentData = parentSnap.data();
              const updatedMeters = (parentData.meters || []).filter((m: any) => m.idPelanggan !== id);
              await updateDoc(parentRef, {
                meters: updatedMeters
              });
            }
          }
        }
        await deleteDoc(targetRef);
      }
    } catch (err: any) {
      alert('Gagal menghapus pengguna: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Sistem</h2>
          <p className="text-slate-500 text-sm font-medium">Kelola profil, pengguna, dan konfigurasi aplikasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'profile', label: 'Profil Saya', icon: User },
            { id: 'users', label: 'Manajemen Pengguna', icon: Shield },
            { id: 'system', label: 'Konfigurasi Sistem', icon: Building2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
            
            {activeTab === 'profile' && (
              <div className="p-8 lg:p-12 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-6 mb-12">
                   <img src={user?.avatar} alt="Avatar" className="w-24 h-24 rounded-3xl border-4 border-slate-50 shadow-inner" />
                   <div>
                      <h3 className="text-xl font-black text-slate-800">{user?.name}</h3>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{user?.role}</p>
                      <button className="mt-2 text-blue-600 text-xs font-black uppercase hover:underline">Ganti Foto Profil</button>
                   </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={profileData.name} 
                        onChange={e => setProfileData({...profileData, name: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                      <input 
                        type="email" 
                        readOnly
                        value={profileData.email} 
                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-100 text-slate-400 outline-none font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon</label>
                      <input 
                        type="text" 
                        value={profileData.phone} 
                        onChange={e => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Kantor</label>
                      <input 
                        type="text" 
                        value={profileData.address} 
                        onChange={e => setProfileData({...profileData, address: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700" 
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Simpan Perubahan
                    </button>
                  </div>
                </form>

                <div className="mt-16 pt-12 border-t border-slate-100">
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Keamanan</h4>
                   <button className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all">
                      <Key size={18} />
                      Ganti Password Akun
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="p-8 lg:p-12 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Daftar Pengguna Sistem</h3>
                   <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/10 flex items-center gap-2">
                      <Plus size={16} /> Tambah User
                   </button>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="border-b border-slate-100">
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengguna</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {allUsers.map(u => (
                            <tr key={u.id} className="group">
                               <td className="py-4">
                                  <div className="flex items-center gap-3">
                                     <img src={u.avatar} alt="Avatar" className="w-8 h-8 rounded-lg" />
                                     <div>
                                        <p className="text-sm font-bold text-slate-700">{u.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{u.role}</td>
                               <td className="py-4">
                                  <select 
                                    value={u.status} 
                                    onChange={(e) => updateUserStatus(u.id, e.target.value as any)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase outline-none ${
                                      u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}
                                  >
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="blocked">Blocked</option>
                                  </select>
                               </td>
                               <td className="py-4 text-right">
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  >
                                     <Trash2 size={16} />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="p-8 lg:p-12 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-12">
                   <section>
                      <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Konfigurasi Entitas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi PDAM</h4>
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Instansi</p>
                                  <p className="text-sm font-black text-slate-700 underline decoration-blue-500/30 underline-offset-4">PDAM TIRTA SERUYAN</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Kantor</p>
                                  <p className="text-sm font-medium text-slate-600">Jl. A. Yani No. 12, Kuala Pembuang, Kalimantan Tengah</p>
                               </div>
                            </div>
                         </div>

                         <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Periode Akuntansi</h4>
                            <div className="space-y-4">
                               <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-slate-700">Tahun Buku Aktif</span>
                                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg">2026</span>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-slate-700">Status Periode</span>
                                  <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase">Open</span>
                               </div>
                               <button className="w-full mt-2 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all">
                                  Tutup Periode (Closing)
                               </button>
                            </div>
                         </div>
                      </div>
                   </section>

                   <section className="pt-12 border-t border-slate-100">
                      <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Konektivitas Database</h3>
                      <div className="flex items-center justify-between p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                               <Settings size={20} />
                            </div>
                            <div>
                               <p className="text-sm font-black text-emerald-800 leading-none">Firebase Production Connected</p>
                               <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wider">pdam-seruyan (Realtime Sync: ON)</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Stable</span>
                         </div>
                      </div>
                   </section>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
