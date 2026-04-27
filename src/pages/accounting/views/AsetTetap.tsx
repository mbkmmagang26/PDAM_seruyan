import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { HardDrive, Loader2, Plus, X, Search } from 'lucide-react';

export default function AsetTetap() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 0,
    bookValue: 0,
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
        bookValue: Number(formData.bookValue),
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ name: '', category: '', acquisitionDate: new Date().toISOString().split('T')[0], acquisitionCost: 0, bookValue: 0, condition: 'baik' });
    } catch (err) {
      alert('Gagal menambah aset');
    }
  };

  const filtered = assets.filter(a => 
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Aset...</div>;

  const totalAssetValue = assets.reduce((sum, a) => sum + (a.bookValue || a.acquisitionCost || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aset Tetap (Fixed Assets)</h2>
          <p className="text-slate-500">Manajemen inventaris dan aset tetap perusahaan.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg shadow-purple-600/20"
        >
          <Plus size={18} /> Tambah Aset
        </button>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg shadow-purple-600/20 flex items-center gap-4">
        <div className="p-4 bg-white/20 rounded-xl">
          <HardDrive size={32} />
        </div>
        <div>
          <p className="text-purple-100 font-medium">Total Nilai Buku Aset</p>
          <p className="text-3xl font-black">{formatCurrency(totalAssetValue)}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">Registrasi Aset Baru</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-bold text-slate-600">Nama Aset</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Kategori</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none">
                <option value="">Pilih Kategori</option>
                <option value="Tanah & Bangunan">Tanah & Bangunan</option>
                <option value="Kendaraan">Kendaraan</option>
                <option value="Mesin & Peralatan">Mesin & Peralatan</option>
                <option value="Inventaris Kantor">Inventaris Kantor</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Tanggal Perolehan</label>
              <input type="date" required value={formData.acquisitionDate} onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Harga Perolehan (Rp)</label>
              <input type="number" required min="0" value={formData.acquisitionCost} onChange={e => setFormData({...formData, acquisitionCost: Number(e.target.value)})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Nilai Buku Saat Ini (Rp)</label>
              <input type="number" required min="0" value={formData.bookValue} onChange={e => setFormData({...formData, bookValue: Number(e.target.value)})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Kondisi</label>
              <select required value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none">
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
            <div className="lg:col-span-3 flex justify-end mt-4">
              <button type="submit" className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700">Simpan Aset</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari aset..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Nama Aset</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Tgl Perolehan</th>
                <th className="p-4 text-right">Harga Perolehan</th>
                <th className="p-4 text-right">Nilai Buku</th>
                <th className="p-4 text-center">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data aset.</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{a.name}</td>
                  <td className="p-4 text-slate-600">{a.category}</td>
                  <td className="p-4 text-slate-600">{a.acquisitionDate}</td>
                  <td className="p-4 text-right text-slate-600">{formatCurrency(a.acquisitionCost || 0)}</td>
                  <td className="p-4 text-right font-bold text-purple-600">{formatCurrency(a.bookValue || a.acquisitionCost || 0)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      a.condition === 'baik' ? 'bg-emerald-100 text-emerald-700' : 
                      a.condition === 'rusak_ringan' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
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
  );
}
