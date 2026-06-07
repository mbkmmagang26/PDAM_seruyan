import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { Users, Loader2, Search, Filter, Download, UserCheck, TrendingUp, Calendar, LayoutDashboard, X, Trash2, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../authContext';
import { logActivity } from '../../../lib/logger';

const getMonthName = (monthStr: string) => {
  if (!monthStr || !monthStr.includes('-')) return '';
  const [, m] = monthStr.split('-');
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return monthNames[parseInt(m, 10) - 1] || '';
};

export default function PiutangAR() {
  const { user } = useAuth();
  const [pelanggan, setPelanggan] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Piutang Pelanggan');
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState('Semua');
  const tabs = ["Piutang Pelanggan", "Riwayat Tagihan", "Analisis Umur Piutang"];

  useEffect(() => {
    const unsubPelanggan = onSnapshot(query(collection(db, 'tb_pelanggan')), (snapshot) => {
      setPelanggan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    
    const unsubBills = onSnapshot(query(collection(db, 'tb_billing')), (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPelanggan();
      unsubBills();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pelanggan ini?')) return;
    try {
      await deleteDoc(doc(db, 'tb_pelanggan', id));
      logActivity(user, 'Hapus Data Pelanggan', `Menghapus data pelanggan dengan ID: ${id}`);
    } catch (err: any) {
      alert('Gagal menghapus pelanggan: ' + err.message);
    }
  };

  const filtered = pelanggan.filter(p => {
    const matchSearch = (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (p.nomorSambungan || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'Menunggak') return matchSearch && (p.tagihanTunggakan || p.balance || 0) > 0;
    if (filterType === 'Lunas') return matchSearch && (p.tagihanTunggakan || p.balance || 0) === 0;
    
    return matchSearch;
  });

  const handleExport = () => {
    if (activeTab === 'Piutang Pelanggan') {
      const data = filtered.map(p => ({
        No_Sambungan: p.nomorSambungan,
        Nama: p.nama,
        Alamat: p.alamat,
        Tagihan: p.tagihanTunggakan || p.balance || 0,
        Status: (p.tagihanTunggakan || p.balance || 0) > 0 ? 'Menunggak' : 'Lunas'
      }));
      exportToCSV(data, 'Laporan_Piutang_Pelanggan');
      logActivity(user, 'Export Laporan', 'Mengekspor Laporan Piutang Pelanggan ke CSV');
    } else if (activeTab === 'Riwayat Tagihan') {
      const data = bills.map(b => ({
        Tanggal: new Date(b.createdAt).toLocaleDateString('id-ID'),
        Pelanggan: b.customerName || 'Unknown',
        Bulan: b.periodeBulan || getMonthName(b.month),
        Tahun: b.periodeTahun || b.year || '',
        Nominal: b.totalTagihan || b.amount || 0,
        Status: b.status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'
      }));
      exportToCSV(data, 'Laporan_Riwayat_Tagihan');
      logActivity(user, 'Export Laporan', 'Mengekspor Laporan Riwayat Tagihan ke CSV');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Piutang...</div>;

  const totalPiutang = pelanggan.reduce((sum, p) => sum + (p.tagihanTunggakan || p.balance || 0), 0);
  const totalMenunggak = pelanggan.filter(p => (p.tagihanTunggakan || p.balance || 0) > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Piutang Usaha & Tagihan</h2>
          <p className="text-slate-500 text-sm">Manajemen tagihan, pembayaran, dan pemantauan piutang pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
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
              <button 
                onClick={() => setShowFilter(true)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${filterType !== 'Semua' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Filter size={18} /> {filterType !== 'Semua' ? `Status: ${filterType}` : 'Filter'}
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
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">
                          Rincian
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-700"
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
      ) : activeTab === 'Riwayat Tagihan' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Tanggal Buat</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Pelanggan</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Periode Tagihan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Total Tagihan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-medium">Belum ada riwayat tagihan.</td></tr>
                  ) : bills.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-700">{new Date(b.createdAt).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-800">{b.customerName || 'Unknown'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-600 font-medium">{b.periodeBulan || getMonthName(b.month)} {b.periodeTahun || b.year || ''}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-black text-slate-700">{formatCurrency(b.totalTagihan || b.amount || 0)}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                          b.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {b.status === 'paid' ? <><CheckCircle size={10} /> LUNAS</> : 'BELUM BAYAR'}
                        </span>
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

      {/* Modal Filter */}
      {showFilter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Filter Status Piutang</h3>
              <button onClick={() => setShowFilter(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {['Semua', 'Menunggak', 'Lunas'].map(type => (
                  <button
                    key={type}
                    onClick={() => { setFilterType(type); setShowFilter(false); }}
                    className={`w-full p-4 rounded-2xl text-left font-bold transition-all border ${
                      filterType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

