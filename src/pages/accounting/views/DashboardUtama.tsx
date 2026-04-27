import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  AlertCircle, CheckSquare, Users, Activity
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardUtama() {
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    assets: 0,
    tasksPending: 0,
    pengaduanPending: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Transactions
    const unsubTx = onSnapshot(query(collection(db, 'transactions')), (snapshot) => {
      let totalInc = 0;
      let totalExp = 0;
      const monthly = new Map<string, { income: number; expense: number }>();

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') totalInc += data.amount || 0;
        else totalExp += data.amount || 0;

        // For Chart
        if (data.date) {
          const month = data.date.substring(0, 7); // YYYY-MM
          if (!monthly.has(month)) monthly.set(month, { income: 0, expense: 0 });
          if (data.type === 'income') monthly.get(month)!.income += data.amount || 0;
          else monthly.get(month)!.expense += data.amount || 0;
        }
      });

      const formattedChart = Array.from(monthly.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, data]) => ({ name: month, Pemasukan: data.income, Pengeluaran: data.expense }));

      setStats(s => ({ ...s, income: totalInc, expense: totalExp }));
      setChartData(formattedChart);
    });

    // Listen to Assets
    const unsubAssets = onSnapshot(collection(db, 'assets'), (snapshot) => {
      let totalAssetValue = 0;
      snapshot.forEach(doc => {
        totalAssetValue += doc.data().nilaiBuku || doc.data().hargaPerolehan || 0;
      });
      setStats(s => ({ ...s, assets: totalAssetValue }));
    });

    // Listen to Tasks
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      let pending = 0;
      snapshot.forEach(doc => {
        if (doc.data().status !== 'completed') pending++;
      });
      setStats(s => ({ ...s, tasksPending: pending }));
    });

    // Listen to Pengaduan
    const unsubPengaduan = onSnapshot(collection(db, 'pengaduan'), (snapshot) => {
      let pending = 0;
      snapshot.forEach(doc => {
        if (doc.data().status === 'Menunggu') pending++;
      });
      setStats(s => ({ ...s, pengaduanPending: pending }));
      setLoading(false);
    });

    return () => {
      unsubTx();
      unsubAssets();
      unsubTasks();
      unsubPengaduan();
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Memuat Dashboard...</div>;
  }

  const kpis = [
    { label: 'Total Pemasukan', value: formatCurrency(stats.income), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Total Pengeluaran', value: formatCurrency(stats.expense), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Laba Bersih', value: formatCurrency(stats.income - stats.expense), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Nilai Aset', value: formatCurrency(stats.assets), icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  const ops = [
    { label: 'Tugas Operasional (Aktif)', value: stats.tasksPending, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Pengaduan Pelanggan (Baru)', value: stats.pengaduanPending, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Utama</h2>
          <p className="text-slate-500">Ringkasan finansial dan operasional terkini.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">{kpi.label}</p>
              <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tren Pendapatan & Pengeluaran (6 Bulan)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `Rp${val/1000000}M`} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Highlights */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Sorotan Operasional</h3>
          {ops.map((op, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3">
              <div className={`w-14 h-14 ${op.bg} ${op.color} rounded-2xl flex items-center justify-center`}>
                <op.icon size={28} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800">{op.value}</p>
                <p className="text-sm font-bold text-slate-500">{op.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
