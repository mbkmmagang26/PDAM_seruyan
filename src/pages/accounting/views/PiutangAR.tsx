import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Users, Loader2, Search, Filter, Download, UserCheck, TrendingUp, Calendar, LayoutDashboard } from 'lucide-react';

export default function PiutangAR() {
  const [pelanggan, setPelanggan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Piutang Pelanggan');
  const tabs = ["Piutang Pelanggan", "Analisis Umur Piutang", "Jadwal Penagihan"];

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'tb_pelanggan')), (snapshot) => {
      setPelanggan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = pelanggan.filter(p => 
    (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.nomorSambungan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Piutang...</div>;

  const totalPiutang = pelanggan.reduce((sum, p) => sum + (p.tagihanTunggakan || p.balance || 0), 0);
  const totalMenunggak = pelanggan.filter(p => (p.tagihanTunggakan || p.balance || 0) > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Piutang Usaha (Accounts Receivable)</h2>
          <p className="text-slate-500 text-sm">Manajemen tagihan dan pemantauan piutang pelanggan.</p>
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
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Piutang</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(totalPiutang)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pelanggan Menunggak</p>
            <p className="text-2xl font-black text-slate-800">{totalMenunggak} <span className="text-sm text-slate-400 font-bold uppercase">Orang</span></p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm flex items-center gap-4 text-white">
          <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Collection Ratio</p>
            <p className="text-2xl font-black text-white">85.4%</p>
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
              activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Piutang Pelanggan' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama atau nomor sambungan..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-sm bg-white">
                <Filter size={18} /> Filter
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">No. Sambungan</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Pelanggan</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Wilayah / Alamat</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Saldo Piutang</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Status</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 font-medium">Belum ada data piutang ditemukan.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <span className="font-mono text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {p.nomorSambungan || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-800">{p.nama}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">GOL: {p.golongan || '-'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-600 font-medium max-w-xs truncate">{p.alamat}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className={`font-black ${ (p.tagihanTunggakan || p.balance || 0) > 0 ? 'text-blue-600' : 'text-slate-400' }`}>
                          {formatCurrency(p.tagihanTunggakan || p.balance || 0)}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          (p.tagihanTunggakan || p.balance || 0) > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {(p.tagihanTunggakan || p.balance || 0) > 0 ? 'Menunggak' : 'Lunas'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 font-bold text-xs">
                          Rincian Tagihan
                        </button>
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
             <LayoutDashboard size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-700">Analisis Umur Piutang</h3>
           <p className="text-slate-500 max-w-xs">Modul untuk memantau piutang berdasarkan usia (0-30, 31-60, 61-90, &gt;90 hari) sedang disiapkan.</p>
        </div>
      )}
    </div>
  );
}

