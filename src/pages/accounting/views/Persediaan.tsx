import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Package, Loader2, Plus, X, Search, Filter, Download, AlertTriangle, ArrowRightLeft, Layers, LayoutDashboard } from 'lucide-react';

export default function Persediaan() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Daftar Stok');
  const tabs = ["Daftar Stok", "Mutasi Stok", "Kategori Barang"];

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'pcs',
    stock: 0,
    minStock: 5,
    price: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'inventory')), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), {
        ...formData,
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        price: Number(formData.price),
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ name: '', category: '', unit: 'pcs', stock: 0, minStock: 5, price: 0 });
    } catch (err) {
      alert('Gagal menambah barang');
    }
  };

  const filtered = items.filter(i => 
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Inventaris...</div>;

  const totalValue = items.reduce((sum, i) => sum + ((i.stock || 0) * (i.price || 0)), 0);
  const lowStockCount = items.filter(i => (i.stock || 0) <= (i.minStock || 0)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Persediaan</h2>
          <p className="text-slate-500 text-sm">Pemantauan stok barang, material, dan suku cadang operasional.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus size={18} /> Tambah Barang
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Package size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nilai Inventaris</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stok Menipis</p>
            <p className="text-2xl font-black text-rose-600">{lowStockCount} <span className="text-sm text-slate-400 font-bold uppercase">Item</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm flex items-center gap-4 text-white">
          <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Layers size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total SKU Aktif</p>
            <p className="text-2xl font-black">{items.length}</p>
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
              activeTab === tab ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Daftar Stok' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama barang atau kategori..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm bg-white shadow-sm"
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
                    <th className="p-4 uppercase tracking-wider text-xs">Informasi Barang</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Kategori</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Stok</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Satuan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Harga Per Unit</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">Belum ada data barang dalam inventaris.</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">REF: {item.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                          {item.category || 'Lainnya'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-700">{item.stock || 0}</td>
                      <td className="p-4 text-slate-500 font-bold text-xs uppercase">{item.unit || 'pcs'}</td>
                      <td className="p-4 text-right font-black text-slate-800">{formatCurrency(item.price || 0)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          (item.stock || 0) <= (item.minStock || 0) ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {(item.stock || 0) <= (item.minStock || 0) ? 'Low Stock' : 'Aman'}
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
             <ArrowRightLeft size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-700">Modul Segera Hadir</h3>
           <p className="text-slate-500 max-w-xs">Fitur mutasi stok dan manajemen kategori sedang dalam tahap pengembangan.</p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800">Tambah Barang Baru</h3>
                <p className="text-sm text-slate-500 font-medium">Registrasi stok barang atau material baru ke sistem.</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-white hover:text-rose-500 p-2 rounded-xl transition-all shadow-sm">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nama Barang</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Pipa PVC 2 inch"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Kategori</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium bg-white"
                  >
                    <option value="">Pilih Kategori</option>
                    <option value="Pipa & Sambungan">Pipa & Sambungan</option>
                    <option value="Water Meter">Water Meter</option>
                    <option value="Pompa & Mesin">Pompa & Mesin</option>
                    <option value="Chemical / Kaporit">Chemical / Kaporit</option>
                    <option value="ATK & Inventaris">ATK & Inventaris</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Satuan</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Contoh: Pcs, Batang, Kg"
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Stok Awal</label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-black text-emerald-600" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Minimum Stok</label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    value={formData.minStock} 
                    onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-black text-rose-600" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Harga Satuan (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-black text-slate-900" 
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
                  className="flex-[2] bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


