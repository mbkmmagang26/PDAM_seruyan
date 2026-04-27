import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Users, Loader2, Search } from 'lucide-react';

export default function PiutangAR() {
  const [pelanggan, setPelanggan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'tb_pelanggan')), (snapshot) => {
      setPelanggan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = pelanggan.filter(p => 
    p.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nomorSambungan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Piutang...</div>;

  // Asumsi: kita menggunakan tagihanTunggakan atau membuat properti balance
  const totalPiutang = pelanggan.reduce((sum, p) => sum + (p.tagihanTunggakan || p.balance || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Piutang Usaha (Accounts Receivable)</h2>
          <p className="text-slate-500">Manajemen tagihan pelanggan PDAM.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-600/20 flex items-center gap-4">
        <div className="p-4 bg-white/20 rounded-xl">
          <Users size={32} />
        </div>
        <div>
          <p className="text-blue-100 font-medium">Total Piutang Pelanggan</p>
          <p className="text-3xl font-black">{formatCurrency(totalPiutang)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari pelanggan atau no sambungan..." 
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
                <th className="p-4">No. Sambungan</th>
                <th className="p-4">Nama Pelanggan</th>
                <th className="p-4">Alamat</th>
                <th className="p-4 text-right">Tagihan Tunggakan (Rp)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data pelanggan.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-600">{p.nomorSambungan || '-'}</td>
                  <td className="p-4 font-bold text-slate-800">{p.nama}</td>
                  <td className="p-4 text-slate-600">{p.alamat}</td>
                  <td className="p-4 text-right font-bold text-blue-600">{formatCurrency(p.tagihanTunggakan || p.balance || 0)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      (p.tagihanTunggakan || p.balance || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {(p.tagihanTunggakan || p.balance || 0) > 0 ? 'Menunggak' : 'Lunas'}
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
