import React, { useState } from 'react';
import { ShieldCheck, Loader2, Search, Filter, CheckCircle, XCircle, Clock, Info } from 'lucide-react';

export default function VerifikasiData() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for verification
  const pendingData = [
    { id: '1', type: 'Jurnal Umum', ref: 'JU-2026-001', amount: 25000000, user: 'Admin Staff', date: '2026-04-27' },
    { id: '2', type: 'Hutang AP', ref: 'AP-2026-042', amount: 12000000, user: 'Finance', date: '2026-04-26' },
    { id: '3', type: 'Aset Tetap', ref: 'AST-2026-005', amount: 45000000, user: 'Procurement', date: '2026-04-26' },
  ];

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Antrian Verifikasi...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Verifikasi & Validasi Data</h2>
          <p className="text-slate-500 text-sm">Otorisasi transaksi dan perubahan data sistem oleh Manajer/Direktur.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Menunggu Otorisasi</p>
            <p className="text-2xl font-black text-slate-800">{pendingData.length} <span className="text-sm text-slate-400 font-bold uppercase">Dokumen</span></p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Terverifikasi Hari Ini</p>
            <p className="text-2xl font-black text-slate-800">12</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 text-slate-400 opacity-60">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Integritas Data</p>
            <p className="text-sm font-black uppercase">100% Validated</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari referensi atau penginput..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm text-xs uppercase tracking-widest">
              <Filter size={16} /> Filter Tipe
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-5">Tipe Dokumen</th>
                <th className="p-5">Nomor Referensi</th>
                <th className="p-5">Penginput</th>
                <th className="p-5 text-center">Tanggal</th>
                <th className="p-5 text-right">Aksi Otorisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingData.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-medium italic">Antrian verifikasi kosong.</td></tr>
              ) : pendingData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {item.type}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-slate-800">{item.ref}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">{item.user.substring(0, 1)}</div>
                       <span className="font-bold text-slate-600">{item.user}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center text-slate-400 font-bold text-xs">
                    {item.date}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100" title="Reject">
                        <XCircle size={20} />
                      </button>
                      <button className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100" title="Verify">
                        <CheckCircle size={20} />
                      </button>
                      <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200" title="Details">
                        <Info size={20} />
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


