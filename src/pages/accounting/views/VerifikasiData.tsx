import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ShieldCheck, Loader2, Search, Filter, CheckCircle, XCircle, Clock, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { useAuth } from '../../../authContext';

export default function VerifikasiData() {
  const { user: currentUser } = useAuth();
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState({ pending: 0, verified: 0 });

  useEffect(() => {
    // Listen for pending transactions
    const q = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPendingData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCounts(prev => ({ ...prev, pending: snapshot.size }));
      setLoading(false);
    });

    // Count verified today (simplified: just count all for now or filter by date if possible)
    // For now we just use the pending count
    return () => unsub();
  }, []);

  // Listen to global dashboard search event
  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (e.detail?.query !== undefined) {
        setSearchTerm(e.detail.query);
      }
    };
    window.addEventListener('app-search', handleGlobalSearch);
    return () => window.removeEventListener('app-search', handleGlobalSearch);
  }, []);

  const handleVerify = async (id: string) => {
    if (!confirm('Verifikasi transaksi ini?')) return;
    try {
      await updateDoc(doc(db, 'transactions', id), {
        status: 'verified',
        verifiedBy: currentUser?.id,
        verifiedByName: currentUser?.name,
        verifiedAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { title: 'Transaksi Diverifikasi', message: 'Data telah resmi masuk ke laporan keuangan.', type: 'success' }
      }));
    } catch (err: any) {
      alert('Gagal memverifikasi: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Alasan penolakan:');
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'transactions', id), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: currentUser?.id,
        rejectedAt: serverTimestamp()
      });
    } catch (err: any) {
      alert('Gagal menolak: ' + err.message);
    }
  };

  const filtered = pendingData.filter(item => 
    (item.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Antrian Verifikasi...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Verifikasi & Validasi Data</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Otorisasi transaksi dan perubahan data sistem oleh Manajer/Direktur.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Menunggu Otorisasi</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{counts.pending} <span className="text-sm text-slate-400 font-bold uppercase">Dokumen</span></p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Integritas Sistem</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">100%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 text-slate-400">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900/50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sistem Keamanan</p>
            <p className="text-sm font-black uppercase tracking-widest">Active Protection</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari referensi atau penginput..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white dark:bg-slate-800"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white dark:bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-5">Tipe & Akun</th>
                <th className="p-5">Deskripsi / Ref</th>
                <th className="p-5 text-right">Nilai (Rp)</th>
                <th className="p-5">Penginput</th>
                <th className="p-5 text-center">Tgl Input</th>
                <th className="p-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-medium italic">Tidak ada transaksi yang menunggu verifikasi.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50/80 transition-colors group">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <span className="px-2 py-0.5 w-fit bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider mb-1">
                        {item.type === 'income' ? 'DEBIT' : 'KREDIT'}
                      </span>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{item.category}</p>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-slate-800 dark:text-white">{item.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.reference}</p>
                  </td>
                  <td className="p-5 text-right font-black text-slate-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                         {(item.authorName || 'U').substring(0, 1)}
                       </div>
                       <span className="font-bold text-slate-600 dark:text-slate-300">{item.authorName || 'User System'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center text-slate-400 font-bold text-xs">
                    {item.date}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleReject(item.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100" 
                        title="Reject"
                      >
                        <XCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleVerify(item.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100" 
                        title="Verify"
                      >
                        <CheckCircle size={20} />
                      </button>
                    </div>
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


