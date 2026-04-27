import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Plus, Search, Filter, Loader2, Save, X } from 'lucide-react';

export default function JurnalUmum() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'expense',
    amount: '',
    category: '', // COA Code
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Listen to Transactions
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Listen to COA
    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTx(); unsubCoa(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        ...formData,
        amount: Number(formData.amount),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ date: new Date().toISOString().split('T')[0], description: '', type: 'expense', amount: '', category: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan jurnal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTx = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Jurnal Umum...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Jurnal Umum</h2>
          <p className="text-slate-500">Pencatatan seluruh transaksi finansial PDAM.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} /> Jurnal Baru
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">Tambah Entri Jurnal</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Tanggal</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Tipe</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                <option value="income">Pemasukan (Debit/Kredit)</option>
                <option value="expense">Pengeluaran (Debit/Kredit)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Akun (COA)</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                <option value="">-- Pilih Akun --</option>
                {coa.map(c => (
                  <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-bold text-slate-600">Keterangan / Uraian</label>
              <input type="text" required placeholder="Contoh: Pembayaran Rekening Air Bp. Budi" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-600">Jumlah (Rp)</label>
              <input type="number" required min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
            </div>
            <div className="lg:col-span-3 flex justify-end mt-4">
              <button disabled={isSubmitting} type="submit" className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan Entri
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari transaksi..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium text-sm">
            <Filter size={18} /> Filter
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4">Akun (COA)</th>
                <th className="p-4 text-right">Debit</th>
                <th className="p-4 text-right">Kredit</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTx.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data transaksi.</td></tr>
              ) : filteredTx.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600">{t.date}</td>
                  <td className="p-4 font-medium text-slate-800">{t.description}</td>
                  <td className="p-4 text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{t.category || '-'}</span>
                  </td>
                  <td className="p-4 text-right font-medium text-emerald-600">{t.type === 'income' ? formatCurrency(t.amount) : '-'}</td>
                  <td className="p-4 text-right font-medium text-rose-600">{t.type === 'expense' ? formatCurrency(t.amount) : '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status || 'pending'}
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
