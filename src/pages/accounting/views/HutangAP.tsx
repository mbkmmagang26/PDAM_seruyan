import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { Wallet, Loader2, Plus, X, Search, Filter, Download, UserPlus, History, LayoutDashboard, Trash2 } from 'lucide-react';
import { useAuth } from '../../../authContext';
import { logActivity } from '../../../lib/logger';

export default function HutangAP() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Daftar Vendor');
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState('Semua');
  const tabs = ["Daftar Vendor", "Riwayat Pembayaran", "Jadwal Hutang"];

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    address: '',
    balance: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'vendors')), (snapshot) => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'vendors'), {
        ...formData,
        balance: Number(formData.balance),
        createdAt: serverTimestamp(),
        authorId: user?.id || 'system',
        authorName: user?.name || 'Unknown'
      });
      logActivity(user, 'Tambah Vendor', `Menambahkan vendor baru: ${formData.company}`);
      setShowAddForm(false);
      setFormData({ name: '', company: '', phone: '', address: '', balance: 0 });
    } catch (err: any) {
      alert('Gagal menambah vendor: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus vendor ini?')) return;
    try {
      await deleteDoc(doc(db, 'vendors', id));
      logActivity(user, 'Hapus Vendor', `Menghapus vendor ID: ${id}`);
    } catch (err: any) {
      alert('Gagal menghapus vendor: ' + err.message);
    }
  };

  const filtered = vendors.filter(v => {
    const matchSearch = (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (v.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'Berhutang') return matchSearch && (v.balance || 0) > 0;
    if (filterType === 'Lunas') return matchSearch && (v.balance || 0) === 0;
    
    return matchSearch;
  });

  const handleExport = () => {
    const data = filtered.map(v => ({
      Perusahaan: v.company,
      Kontak: v.name,
      Telepon: v.phone,
      Alamat: v.address,
      Saldo_Hutang: v.balance || 0,
      Status: (v.balance || 0) > 0 ? 'Hutang Aktif' : 'Lunas'
    }));
    exportToCSV(data, 'Laporan_Hutang_Vendor');
    logActivity(user, 'Export Hutang Vendor', 'Mengekspor laporan hutang vendor ke CSV');
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Hutang...</div>;

  const totalHutang = vendors.reduce((sum, v) => sum + (v.balance || 0), 0);
  const activeVendors = vendors.filter(v => (v.balance || 0) > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hutang Usaha (Accounts Payable)</h2>
          <p className="text-slate-500 text-sm">Manajemen kewajiban dan hubungan pemasok (vendor).</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95"
          >
            <UserPlus size={18} /> Tambah Vendor
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Saldo Hutang</p>
            <p className="text-2xl font-black text-rose-600">{formatCurrency(totalHutang)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <History size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vendor Aktif</p>
            <p className="text-2xl font-black text-slate-800">{activeVendors} <span className="text-sm text-slate-400 font-bold uppercase">Mitra</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm flex items-center gap-4 text-white">
          <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jatuh Tempo (7 Hari)</p>
            <p className="text-2xl font-black">Rp 0</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-colors relative ${
              activeTab === tab ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Daftar Vendor' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama vendor atau kontak..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none text-sm bg-white shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilter(true)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${filterType !== 'Semua' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Filter size={18} /> {filterType !== 'Semua' ? `Status: ${filterType}` : 'Filter'}
              </button>
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-sm bg-white shadow-sm"
              >
                <Download size={18} /> Export
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Vendor / Perusahaan</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Kontak & Telepon</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Alamat Utama</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Total Kewajiban</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Status</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">Belum ada data vendor yang terdaftar.</td></tr>
                  ) : filtered.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                            {v.company?.substring(0, 1) || 'V'}
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{v.company}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {v.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.phone}</p>
                      </td>
                      <td className="p-4 text-slate-500 font-medium max-w-xs truncate">{v.address}</td>
                      <td className="p-4 text-right">
                        <p className={`font-black ${ (v.balance || 0) > 0 ? 'text-rose-600' : 'text-slate-400' }`}>
                          {formatCurrency(v.balance || 0)}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          (v.balance || 0) > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {(v.balance || 0) > 0 ? 'Hutang Aktif' : 'Lunas'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800">
                          Detail
                        </button>
                        <button 
                          onClick={() => handleDelete(v.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 text-rose-600 p-1.5 rounded-lg hover:bg-rose-100"
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
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-20 text-center flex flex-col items-center">
           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
             <History size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-700">Modul Segera Hadir</h3>
           <p className="text-slate-500 max-w-xs">Fitur riwayat pembayaran dan jadwal jatuh tempo sedang dalam tahap pengembangan.</p>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800">Registrasi Vendor Baru</h3>
                <p className="text-sm text-slate-500 font-medium">Lengkapi detail informasi pemasok / mitra bisnis.</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-white hover:text-rose-500 p-2 rounded-xl transition-all shadow-sm">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nama Kontak</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Bpk. Budi Santoso"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nama Perusahaan / Toko</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: PT. Sumber Makmur"
                    value={formData.company} 
                    onChange={e => setFormData({...formData, company: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nomor Telepon</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="0812-xxxx-xxxx"
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Saldo Awal Hutang (Rp)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.balance} 
                    onChange={e => setFormData({...formData, balance: Number(e.target.value)})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-black text-rose-600" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Alamat Lengkap</label>
                  <textarea 
                    required 
                    rows={3}
                    placeholder="Masukkan alamat lengkap vendor..."
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-medium resize-none" 
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-rose-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-[0.98]"
                >
                  Simpan Vendor Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Filter */}
      {showFilter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Filter Status Hutang</h3>
              <button onClick={() => setShowFilter(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {['Semua', 'Berhutang', 'Lunas'].map(type => (
                  <button
                    key={type}
                    onClick={() => { setFilterType(type); setShowFilter(false); }}
                    className={`w-full p-4 rounded-2xl text-left font-bold transition-all border ${
                      filterType === type ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

