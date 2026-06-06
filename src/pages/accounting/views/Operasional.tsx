import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Grid, Loader2, Search, Filter, CheckCircle2, Clock, AlertCircle, Calendar, Download } from 'lucide-react';

export default function Operasional() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');

  useEffect(() => {
    setLoading(true);
    let q;
    if (activeStatus !== 'all') {
      q = query(
        collection(db, 'aksi_pengaduan'),
        where('status', '==', activeStatus),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'aksi_pengaduan'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error in Operasional query:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [activeStatus]);

  const filtered = tasks.filter(t => {
    const matchesSearch = (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (t.assignedToName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Operasional...</div>;

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pemantauan Operasional</h2>
          <p className="text-slate-500 text-sm">Monitoring real-time tugas lapangan dan pemeliharaan teknis.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Download size={18} /> Export Log
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tugas Selesai</p>
            <p className="text-2xl font-black text-slate-800">{completedCount}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sedang Berjalan</p>
            <p className="text-2xl font-black text-slate-800">{inProgressCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Menunggu</p>
            <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari tugas, deskripsi, atau petugas..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={activeStatus}
              onChange={e => setActiveStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs bg-white outline-none focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="in_progress">Berjalan</option>
              <option value="completed">Selesai</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-5">Tugas & Deskripsi</th>
                <th className="p-5">Tipe Pekerjaan</th>
                <th className="p-5">Petugas Pelaksana</th>
                <th className="p-5">Tgl Dibuat</th>
                <th className="p-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-medium italic">Tidak ada catatan operasional yang ditemukan.</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5">
                    <div className="flex flex-col">
                      <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{t.title}</p>
                      <p className="text-xs text-slate-500 max-w-xs truncate font-medium">{t.description}</p>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                      {t.type?.replace('_', ' ') || 'Umum'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {t.assignedToName?.substring(0, 1) || '?'}
                      </div>
                      <span className="font-bold text-slate-700">{t.assignedToName || 'Belum Ditugaskan'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-slate-400 font-bold text-xs">
                    {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      t.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {t.status?.replace('_', ' ')}
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

