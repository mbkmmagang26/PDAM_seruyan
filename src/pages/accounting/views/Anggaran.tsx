import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Target, Loader2, Plus, Search, Filter, Download, ArrowUpRight, BarChart3, X, Calculator, Calendar } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export default function Anggaran() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    coaCode: '',
    amount: 0,
    year: new Date().getFullYear(),
    category: 'Operasional'
  });

  useEffect(() => {
    const unsubBudgets = onSnapshot(query(collection(db, 'budgets'), where('year', '==', selectedYear)), (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTx = onSnapshot(query(collection(db, 'transactions'), where('type', '==', 'expense')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCoa = onSnapshot(query(collection(db, 'coa')), (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubBudgets(); unsubTx(); unsubCoa(); };
  }, [selectedYear]);

  const processedBudgets = useMemo(() => {
    return budgets.map(b => {
      const coaInfo = coa.find(c => c.code === b.coaCode);
      const realized = transactions
        .filter(t => t.category === b.coaCode)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      return {
        ...b,
        name: coaInfo?.name || 'Akun Tidak Ditemukan',
        realized
      };
    }).filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.coaCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [budgets, transactions, coa, searchTerm]);

  const totalBudget = processedBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalRealized = processedBudgets.reduce((sum, b) => sum + (Number(b.realized) || 0), 0);
  const absorptionRate = totalBudget > 0 ? Math.round((totalRealized / totalBudget) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'budgets'), {
        ...formData,
        amount: Number(formData.amount),
        createdAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ coaCode: '', amount: 0, year: selectedYear, category: 'Operasional' });
    } catch (err) {
      alert('Gagal menambah anggaran');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Anggaran...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Anggaran</h2>
          <p className="text-slate-500 text-sm font-medium">Pemantauan Pagu vs Realisasi Biaya Tahun Anggaran {selectedYear}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={18} /> Setup Anggaran Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-colors">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Target size={32} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Pagu Anggaran</p>
            <p className="text-3xl font-black text-slate-800">{formatCurrency(totalBudget)}</p>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-colors">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Calendar size={32} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Realisasi</p>
            <p className="text-3xl font-black text-slate-800">{formatCurrency(totalRealized)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-blue-600">{absorptionRate}%</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Serapan</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari mata anggaran atau kode akun..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white shadow-sm font-medium"
            />
          </div>
          <div className="flex gap-2">
             <select 
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm text-sm">
              <Download size={18} /> Export RKAP
            </button>
          </div>
        </div>
        
        {processedBudgets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Target size={40} className="opacity-20" />
             </div>
             <p className="font-bold text-sm">Belum ada data anggaran terdaftar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
                <tr>
                  <th className="p-5">Mata Anggaran</th>
                  <th className="p-5">Kategori</th>
                  <th className="p-5 text-right">Pagu Anggaran</th>
                  <th className="p-5 text-right">Realisasi</th>
                  <th className="p-5">Progress Penyerapan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedBudgets.map(b => {
                  const percent = b.amount > 0 ? Math.min(Math.round((b.realized / b.amount) * 100), 100) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-[10px]">
                            {b.coaCode}
                          </div>
                          <span className="font-black text-slate-800">{b.name}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {b.category}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-slate-700">{formatCurrency(b.amount)}</td>
                      <td className="p-5 text-right font-black text-blue-600">{formatCurrency(b.realized)}</td>
                      <td className="p-5 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                percent > 90 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Setup Budget Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">Setup Alokasi Anggaran</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-white hover:text-rose-500 p-2 rounded-xl transition-all shadow-sm">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Rekening Biaya</label>
                  <select 
                    required 
                    value={formData.coaCode} 
                    onChange={e => setFormData({...formData, coaCode: e.target.value})} 
                    className="w-full p-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-blue-600 bg-white"
                  >
                    <option value="">-- Pilih Akun --</option>
                    {coa.filter(c => c.code && c.code.startsWith('5')).map(c => (
                      <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pagu Anggaran Tahunan (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      placeholder="0"
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-slate-700" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tahun Anggaran</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.year} 
                    readOnly
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 outline-none font-bold" 
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  <Target size={18} /> Alokasikan Pagu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



