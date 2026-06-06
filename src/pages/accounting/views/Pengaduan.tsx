import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { MessageCircle, Loader2, Search, Filter, CheckCircle2, AlertCircle, Clock, Download, User, Trash2 } from 'lucide-react';

export default function Pengaduan() {
  const [pengaduan, setPengaduan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    let q;
    if (activeFilter !== 'all') {
      q = query(
        collection(db, 'pengaduan_pelanggan'),
        where('status', '==', activeFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'pengaduan_pelanggan'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setPengaduan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error in Pengaduan query:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [activeFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengaduan ini?')) return;
    try {
      await deleteDoc(doc(db, 'pengaduan_pelanggan', id));
    } catch (err: any) {
      alert('Gagal menghapus pengaduan: ' + err.message);
    }
  };

  const filtered = pengaduan.filter(p => {
    const matchesSearch = (p.namaPelanggan || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.nomorSambungan || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Pengaduan...</div>;

  const totalPengaduan = pengaduan.length;
  const selesaiCount = pengaduan.filter(p => p.status === 'Selesai').length;
  const prosesCount = pengaduan.filter(p => p.status === 'Sedang Diproses').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pengaduan Pelanggan</h2>
          <p className="text-slate-500 text-sm">Monitoring masukan, keluhan, dan aspirasi pelanggan PDAM.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Download size={18} /> Export Laporan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <MessageCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pengaduan</p>
            <p className="text-2xl font-black text-slate-800">{totalPengaduan}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Berhasil Ditangani</p>
            <p className="text-2xl font-black text-emerald-600">{selesaiCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sedang Diproses</p>
            <p className="text-2xl font-black text-slate-800">{prosesCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari pelanggan, nomor sambungan, atau keluhan..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={activeFilter}
              onChange={e => setActiveFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs bg-white outline-none focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Sedang Diproses">Sedang Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-5">Pelanggan</th>
                <th className="p-5">Deskripsi Keluhan</th>
                <th className="p-5 text-center">Tgl Masuk</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-medium italic">Tidak ada data pengaduan yang ditemukan.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{p.namaPelanggan}</p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">NO: {p.nomorSambungan}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-slate-600 font-medium whitespace-normal min-w-[300px] max-w-lg leading-relaxed text-xs">
                      {p.deskripsi}
                    </p>
                  </td>
                  <td className="p-5 text-center text-slate-400 font-bold text-xs uppercase">
                    {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      p.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      p.status === 'Sedang Diproses' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {p.status || 'Menunggu'}
                    </span>
                  </td>
                  <td className="p-5 text-right flex justify-end gap-2">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95">
                      Detail
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
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
  );
}

