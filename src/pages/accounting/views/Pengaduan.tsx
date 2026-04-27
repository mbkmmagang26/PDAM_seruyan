import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { MessageCircle, Loader2, Search } from 'lucide-react';

export default function Pengaduan() {
  const [pengaduan, setPengaduan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'pengaduan'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPengaduan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = pengaduan.filter(p => 
    p.namaPelanggan?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.deskripsi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nomorSambungan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Pengaduan...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pengaduan Pelanggan</h2>
          <p className="text-slate-500">Monitoring pengaduan pelanggan yang masuk.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari pelanggan atau pengaduan..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Tanggal Laporan</th>
                <th className="p-4">Data Pelanggan</th>
                <th className="p-4">Deskripsi Masalah</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada data pengaduan.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600">{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{p.namaPelanggan}</p>
                    <p className="text-xs text-slate-500 font-mono">No. {p.nomorSambungan}</p>
                  </td>
                  <td className="p-4 text-slate-600 whitespace-normal min-w-[300px]">{p.deskripsi}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                      p.status === 'Sedang Diproses' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status || 'Menunggu'}
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
