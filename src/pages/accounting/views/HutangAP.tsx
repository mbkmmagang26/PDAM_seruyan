import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Wallet, Loader2, Plus, X, Search } from 'lucide-react';

export default function HutangAP() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ name: '', company: '', phone: '', address: '', balance: 0 });
    } catch (err) {
      alert('Gagal menambah vendor');
    }
  };

  const filtered = vendors.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Hutang...</div>;

  const totalHutang = vendors.reduce((sum, v) => sum + (v.balance || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hutang Usaha (Accounts Payable)</h2>
          <p className="text-slate-500">Manajemen data vendor dan kewajiban pembayaran.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/20"
        >
          <Plus size={18} /> Tambah Vendor
        </button>
      </div>

      <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl text-white shadow-lg shadow-rose-600/20 flex items-center gap-4">
        <div className="p-4 bg-white/20 rounded-xl">
          <Wallet size={32} />
        </div>
        <div>
          <p className="text-rose-100 font-medium">Total Saldo Hutang</p>
          <p className="text-3xl font-black">{formatCurrency(totalHutang)}</p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">Tambah Vendor Baru</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Nama Kontak</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Nama Perusahaan / Toko</label>
              <input type="text" required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Nomor Telepon</label>
              <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-bold text-slate-600">Alamat Lengkap</label>
              <input type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Saldo Awal Hutang (Rp)</label>
              <input type="number" min="0" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
            </div>
            <div className="lg:col-span-3 flex justify-end mt-4">
              <button type="submit" className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-rose-700">Simpan Vendor</button>
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
              placeholder="Cari vendor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-rose-500 outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Vendor / Perusahaan</th>
                <th className="p-4">Kontak</th>
                <th className="p-4">Alamat</th>
                <th className="p-4 text-right">Saldo Hutang (Rp)</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data vendor.</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{v.company}</p>
                    <p className="text-xs text-slate-500">{v.name}</p>
                  </td>
                  <td className="p-4 text-slate-600">{v.phone}</td>
                  <td className="p-4 text-slate-600">{v.address}</td>
                  <td className="p-4 text-right font-bold text-rose-600">{formatCurrency(v.balance || 0)}</td>
                  <td className="p-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg">Bayar Hutang</button>
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
