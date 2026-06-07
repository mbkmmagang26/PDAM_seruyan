import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  AlertCircle, CheckSquare, Users, Activity,
  ArrowUpRight, ArrowDownRight, Wallet, LayoutGrid, Clock,
  Layers, MessageCircle
} from 'lucide-react';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../../../authContext';
import { Download } from 'lucide-react';

export default function DashboardUtama() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    assets: 0,
    inventoryValue: 0,
    lowStock: 0,
    tasksPending: 0,
    pengaduanPending: 0,
    cashTransit: 0,
    piutang: 0,
    assetCategoriesCount: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  useEffect(() => {
    // Listen to Transactions of current budget year
    const currentYearStart = `${selectedYear}-01-01`;
    const currentYearEnd = `${selectedYear}-12-31`;
    const unsubTx = onSnapshot(query(
      collection(db, 'transactions'),
      where('date', '>=', currentYearStart),
      where('date', '<=', currentYearEnd)
    ), (snapshot) => {
      let totalInc = 0;
      let totalExp = 0;
      let transit = 0;
      const monthly = new Map<string, { income: number; expense: number }>();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      monthNames.forEach(m => monthly.set(m, { income: 0, expense: 0 }));

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') totalInc += data.amount || 0;
        else totalExp += data.amount || 0;

        if (data.category === 'Kas Transit') transit += data.amount || 0;

        // For Chart
        if (data.date) {
          const dateObj = new Date(data.date);
          const month = dateObj.toLocaleString('id-ID', { month: 'short' });
          if (!monthly.has(month)) monthly.set(month, { income: 0, expense: 0 });
          if (data.type === 'income') monthly.get(month)!.income += data.amount || 0;
          else monthly.get(month)!.expense += data.amount || 0;
        }
      });

      const formattedChart = Array.from(monthly.entries())
        .map(([name, data]) => ({ name, Pemasukan: data.income, Pengeluaran: data.expense }));

      setStats(s => ({ ...s, income: totalInc, expense: totalExp, cashTransit: transit }));
      setChartData(formattedChart);
    });

    // Listen to Inventory
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      let totalVal = 0;
      let low = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        totalVal += (data.stock || 0) * (data.price || 0);
        if ((data.stock || 0) <= (data.minStock || 5)) low++;
      });
      setStats(s => ({ ...s, inventoryValue: totalVal, lowStock: low }));
    });

    // Listen to Assets
    const unsubAssets = onSnapshot(collection(db, 'assets'), (snapshot) => {
      let totalAssetValue = 0;
      const categories = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        totalAssetValue += data.nilaiBuku || data.hargaPerolehan || 0;
        if (data.kategori) categories.add(data.kategori);
      });
      setStats(s => ({ ...s, assets: totalAssetValue, assetCategoriesCount: categories.size }));
    });

    // Listen to Tasks
    const unsubTasks = onSnapshot(collection(db, 'aksi_pengaduan'), (snapshot) => {
      let pending = 0;
      snapshot.forEach(doc => {
        if (doc.data().status !== 'completed') pending++;
      });
      setStats(s => ({ ...s, tasksPending: pending }));
    });

    // Listen to Pengaduan
    const unsubPengaduan = onSnapshot(collection(db, 'pengaduan_pelanggan'), (snapshot) => {
      let pending = 0;
      snapshot.forEach(doc => {
        const status = doc.data().status;
        if (status === 'Menunggu Respon') pending++;
      });
      setStats(s => ({ ...s, pengaduanPending: pending }));
    });

    // Listen to Piutang (tb_pelanggan)
    const unsubPiutang = onSnapshot(collection(db, 'tb_pelanggan'), (snapshot) => {
      let totalPiutang = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        totalPiutang += data.tagihanTunggakan || data.balance || 0;
      });
      setStats(s => ({ ...s, piutang: totalPiutang }));
      setLoading(false);
    });

    return () => {
      unsubTx();
      unsubInv();
      unsubAssets();
      unsubTasks();
      unsubPengaduan();
      unsubPiutang();
    };
  }, [selectedYear]);

  const handleExportChart = () => {
    exportToCSV(chartData, 'Analisis_Keuangan_Bulanan');
  };

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Menyiapkan Dashboard Intelijen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Dashboard Utama</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sistem Informasi Akuntansi &bull; LIVE</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div 
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Periode Anggaran</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">Jan - Des {selectedYear}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-blue-600 dark:text-blue-400 p-2 rounded-xl transition-all">
               <Activity size={20} />
            </div>
          </div>
          {isYearDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden z-50">
              {['2024', '2025', '2026', '2027'].map(year => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false); }}
                  className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors ${selectedYear === year ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  Jan - Des {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isStaff ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Laba Rugi Card */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-1">Laba Rugi Berjalan</p>
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={12} /> +12.5%
                    </span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 dark:text-white mt-4 leading-none">{formatCurrency(stats.income - stats.expense)}</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2">Akumulasi pendapatan dikurangi beban</p>
                </div>
                
                <div className="mt-12 flex items-center gap-4">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-3/4 rounded-full shadow-lg shadow-emerald-500/20"></div>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">75%</span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 dark:bg-slate-700/30 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
            </div>

            {/* Posisi Kas Card */}
            <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-black text-blue-400 tracking-widest uppercase mb-1">Likuiditas (Total Kas)</p>
                <h3 className="text-4xl font-black text-white mt-4 leading-none">{formatCurrency(stats.income - stats.expense + stats.cashTransit)}</h3>
                
                <div className="mt-10 space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Wallet size={16} className="text-blue-400" />
                      <span className="text-xs font-bold text-slate-300">Bank & Kas</span>
                    </div>
                    <span className="text-xs font-black text-white">{formatCurrency(stats.income - stats.expense)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-amber-400" />
                      <span className="text-xs font-bold text-slate-300">Kas Transit (1.1.6)</span>
                    </div>
                    <span className="text-xs font-black text-white">{formatCurrency(stats.cashTransit)}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[80px] opacity-30"></div>
            </div>

            {/* Piutang Card */}
            <div 
              onClick={() => window.dispatchEvent(new CustomEvent('app-change-module', { detail: { module: 'piutang_ar' } }))}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] shadow-xl shadow-blue-600/20 text-white relative overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 group"
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-xs font-black text-blue-200 tracking-widest uppercase mb-1">Outstanding Piutang (AR)</p>
                  <h3 className="text-4xl font-black text-white mt-4 leading-none group-hover:scale-105 origin-left transition-transform duration-300">{formatCurrency(stats.piutang)}</h3>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-100/80 leading-relaxed max-w-[150px]">Estimasi penagihan aktif bulan ini.</p>
                  <div className="mt-6 flex justify-between items-end">
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-600 bg-blue-400 flex items-center justify-center text-[10px] font-bold transition-transform group-hover:-translate-y-1">U{i}</div>)}
                    </div>
                    <ArrowUpRight size={24} className="text-blue-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Chart */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                  <div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Dinamika Keuangan</h4>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Cash Flow Analytics (Monthly)</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-blue-600 shadow-lg shadow-blue-600/20"></div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inflow</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outflow</span>
                    </div>
                    <button 
                      onClick={handleExportChart}
                      className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => `Rp ${val/1000000}jt`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="Pemasukan" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorIn)" />
                      <Area type="monotone" dataKey="Pengeluaran" stroke="#cbd5e1" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Actions / Operational Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('app-change-module', { detail: { module: 'persediaan' } }))}
                  className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 p-6 rounded-[1.5rem] flex items-center justify-between group cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-rose-950 dark:text-rose-100 uppercase tracking-tight">Stok Menipis</p>
                      <p className="text-xs font-bold text-rose-700/60 dark:text-rose-400/80">{stats.lowStock} ITEM PERLU RE-ORDER</p>
                    </div>
                  </div>
                  <ArrowUpRight className="text-rose-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
                <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('app-change-module', { detail: { module: 'pengaduan' } }))}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-6 rounded-[1.5rem] flex items-center justify-between group cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                      <MessageCircle size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-blue-950 dark:text-blue-100 uppercase tracking-tight">Pengaduan Baru</p>
                      <p className="text-xs font-bold text-blue-700/60 dark:text-blue-400/80">{stats.pengaduanPending} LAPORAN MENUNGGU</p>
                    </div>
                  </div>
                  <ArrowUpRight className="text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
                <div 
                  onClick={() => window.dispatchEvent(new CustomEvent('app-change-module', { detail: { module: 'operasional' } }))}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 p-6 rounded-[1.5rem] flex items-center justify-between group cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
                      <CheckSquare size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-tight">Tugas Lapangan</p>
                      <p className="text-xs font-bold text-amber-700/60 dark:text-amber-400/80">{stats.tasksPending} PENDING / BERJALAN</p>
                    </div>
                  </div>
                  <ArrowUpRight className="text-amber-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Asset Metrics */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-1">Fixed Assets</p>
                    <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Aktiva Tetap</h4>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400">
                    <Package size={24} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                       <span>Total Valuasi</span>
                       <span className="text-emerald-500 dark:text-emerald-400">Appreciated</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(stats.assets)}</p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500 dark:text-slate-400">Asset Count</span>
                       <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200 font-black">{stats.assetCategoriesCount} Categories</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Summary */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-1">Inventory Value</p>
                      <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Stok Material</h4>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                      <Layers size={24} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                         <span>Stock Valuation</span>
                         <span className="text-blue-500 dark:text-blue-400">Real-time</span>
                      </div>
                      <p className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(stats.inventoryValue)}</p>
                    </div>
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Operational Ready</span>
                       </div>
                       <button 
                         onClick={() => window.dispatchEvent(new CustomEvent('app-change-module', { detail: { module: 'persediaan' } }))}
                         className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
                       >
                         Detail Stok
                       </button>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl opacity-50"></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
           <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
              <div className="relative z-10 max-w-lg">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-white mb-8 mx-auto backdrop-blur-md border border-white/10">
                   <Users size={40} />
                </div>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Monitoring Operasional</h3>
                <p className="text-slate-400 leading-relaxed font-medium">Anda login menggunakan peran <span className="text-blue-400 font-bold">STAFF OPERASIONAL</span>. Akses data finansial dibatasi sesuai kebijakan privasi perusahaan.</p>
                <div className="mt-10 flex gap-4 justify-center">
                   <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-white text-sm font-black uppercase tracking-widest">Akses Terbatas</div>
                   <div className="px-6 py-3 bg-blue-600 rounded-2xl text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">Buka Tugas</div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-[120px] opacity-20"></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                       <CheckSquare size={32} />
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tugas Operasional</p>
                       <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.tasksPending} Pending</p>
                    </div>
                 </div>
                 <ArrowUpRight size={24} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-all">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-all duration-500">
                       <AlertCircle size={32} />
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pengaduan Masuk</p>
                       <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pengaduanPending} Baru</p>
                    </div>
                 </div>
                 <ArrowUpRight size={24} className="text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}


