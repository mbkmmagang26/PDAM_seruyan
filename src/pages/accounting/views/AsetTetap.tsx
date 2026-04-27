import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { HardDrive, Loader2, Plus, X, Search, Filter, Download, Activity, PieChart, LayoutDashboard, Briefcase, Calculator } from 'lucide-react';

export default function AsetTetap() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Daftar Aset');
  const tabs = ["Daftar Aset", "Penyusutan", "Mutasi Aset"];

  const [formData, setFormData] = useState({
    name: '',
    category: 'Peralatan & Mesin',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 0,
    depreciationMethod: 'Garis Lurus',
    usefulLife: 5,
    residualValue: 0,
    condition: 'baik'
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'assets')), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'assets'), {
        ...formData,
        acquisitionCost: Number(formData.acquisitionCost),
        usefulLife: Number(formData.usefulLife),
        residualValue: Number(formData.residualValue),
        bookValue: Number(formData.acquisitionCost), // Initial book value is cost
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ 
        name: '', 
        category: 'Peralatan & Mesin', 
        acquisitionDate: new Date().toISOString().split('T')[0], 
        acquisitionCost: 0, 
        depreciationMethod: 'Garis Lurus',
        usefulLife: 5,
        residualValue: 0,
        condition: 'baik' 
      });
    } catch (err) {
      alert('Gagal menambah aset');
    }
  };

  const filtered = assets.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Aset...</div>;

  const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.bookValue) || Number(a.acquisitionCost) || 0), 0);
  const categoriesCount = new Set(assets.map(a => a.category)).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aset Tetap (Fixed Assets)</h2>
          <p className="text-slate-500 text-sm">Pengelolaan inventaris, nilai buku, dan penyusutan aset.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={18} /> Tambah Aset Tetap
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <HardDrive size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Nilai Buku</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(totalAssetValue)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Briefcase size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Aset</p>
            <p className="text-2xl font-black text-slate-800">{categoriesCount} <span className="text-sm text-slate-400 font-bold uppercase">Grup</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm flex items-center gap-4 text-white">
          <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kondisi Aset Baik</p>
            <p className="text-2xl font-black">100%</p>
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
              activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Daftar Aset' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama aset atau kategori..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white shadow-sm font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-sm bg-white">
                <Filter size={18} /> Filter
              </button>
              <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-sm bg-white">
                <Download size={18} /> Export
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Informasi Aset</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Kategori</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Tgl Perolehan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Harga Perolehan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Nilai Buku</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">Belum ada data aset yang terdaftar.</td></tr>
                  ) : filtered.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            <Briefcase size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{a.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">REF: {a.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                          {a.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-bold text-xs">{a.acquisitionDate}</td>
                      <td className="p-4 text-right text-slate-600 font-medium">{formatCurrency(a.acquisitionCost || 0)}</td>
                      <td className="p-4 text-right">
                        <p className="font-black text-blue-600">{formatCurrency(a.bookValue || a.acquisitionCost || 0)}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          a.condition === 'baik' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          a.condition === 'rusak_ringan' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {a.condition?.replace('_', ' ') || 'baik'}
                        </span>
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
              <PieChart size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-700">Analisis Aset & Penyusutan</h3>
           <p className="text-slate-500 max-w-xs font-medium">Modul perhitungan penyusutan otomatis dan laporan mutasi aset sedang disiapkan.</p>
        </div>
      )}

      {/* Add Asset Modal (Revamped per Screenshot) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Tambah Aset Tetap</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Registrasi aset inventaris atau operasional baru.</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-white hover:text-rose-500 p-2 rounded-full transition-all shadow-sm border border-slate-100">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Aset</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Cth: Pompa Air Sentrifugal 50HP"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                  >
                    <option value="Peralatan & Mesin">Peralatan & Mesin</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Tanah & Bangunan">Tanah & Bangunan</option>
                    <option value="Inventaris Kantor">Inventaris Kantor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tgl Perolehan</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.acquisitionDate} 
                    onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Perolehan (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    value={formData.acquisitionCost} 
                    onChange={e => setFormData({...formData, acquisitionCost: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Penyusutan</label>
                  <select 
                    value={formData.depreciationMethod} 
                    onChange={e => setFormData({...formData, depreciationMethod: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                  >
                    <option value="Garis Lurus">Garis Lurus</option>
                    <option value="Saldo Menurun">Saldo Menurun</option>
                    <option value="Tanpa Penyusutan">Tanpa Penyusutan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Umur Ekonomis (Tahun)</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={formData.usefulLife} 
                    onChange={e => setFormData({...formData, usefulLife: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Sisa / Residu (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    value={formData.residualValue} 
                    onChange={e => setFormData({...formData, residualValue: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] text-slate-400 font-medium italic">Buku besar akan di-update secara asinkron saat posting bulanan.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


