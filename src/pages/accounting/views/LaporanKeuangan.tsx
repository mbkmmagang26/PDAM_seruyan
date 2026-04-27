import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { BarChart3, Loader2, Download, Printer, FileText, ChevronRight, Calculator, PieChart, Share2, Eye, Calendar, Settings, Layout, Layers, RefreshCw, Search } from 'lucide-react';

type ReportType = 'laba_rugi' | 'neraca' | 'arus_kas' | 'ekuitas';

export default function LaporanKeuangan() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportType>('laba_rugi');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [theme, setTheme] = useState<'standard' | 'blue' | 'dark'>('standard');

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    const unsubTx = onSnapshot(query(collection(db, 'transactions')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCoa = onSnapshot(query(collection(db, 'coa')), (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubTx(); unsubCoa(); };
  }, []);

  const reportData = useMemo(() => {
    const grouped: Record<string, number> = {};
    coa.forEach(c => { if (c.code) grouped[c.code] = 0; });

    // Improved date filtering to handle Firestore Timestamps
    const filteredTx = transactions.filter(t => {
      if (!t.date) return false;
      const txDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
    });

    filteredTx.forEach(t => {
      if (!t.category) return;
      if (!grouped[t.category]) grouped[t.category] = 0;
      const isAssetOrExpense = t.category.startsWith('1') || t.category.startsWith('5');
      const debit = t.type === 'income' ? t.amount : 0;
      const kredit = t.type === 'expense' ? t.amount : 0;
      if (isAssetOrExpense) grouped[t.category] += (debit - kredit);
      else grouped[t.category] += (kredit - debit);
    });

    // Laba Rugi Data
    const pendapatan = coa.filter(c => c.code && c.code.startsWith('4')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const beban = coa.filter(c => c.code && c.code.startsWith('5')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const totalPendapatan = pendapatan.reduce((sum, item) => sum + item.amount, 0);
    const totalBeban = beban.reduce((sum, item) => sum + item.amount, 0);
    const labaBersih = totalPendapatan - totalBeban;

    // Neraca Data
    const aset = coa.filter(c => c.code && c.code.startsWith('1')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const kewajiban = coa.filter(c => c.code && c.code.startsWith('2')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const ekuitas = coa.filter(c => c.code && c.code.startsWith('3')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const totalAset = aset.reduce((sum, item) => sum + item.amount, 0);
    const totalKewajiban = kewajiban.reduce((sum, item) => sum + item.amount, 0);
    const totalEkuitas = ekuitas.reduce((sum, item) => sum + item.amount, 0) + labaBersih;

    // Arus Kas Data (Simplified)
    const arusOperasional = totalPendapatan - totalBeban;
    const arusInvestasi = -aset.filter(a => a.code.startsWith('1.3')).reduce((sum, a) => sum + a.amount, 0); // Asset tetap
    const arusPendanaan = totalKewajiban + (totalEkuitas - labaBersih); // Kewajiban + Modal
    const kenaikanKas = arusOperasional + arusInvestasi + arusPendanaan;

    return {
      pendapatan, beban, totalPendapatan, totalBeban, labaBersih,
      aset, kewajiban, ekuitas, totalAset, totalKewajiban, totalEkuitas,
      arusOperasional, arusInvestasi, arusPendanaan, kenaikanKas
    };
  }, [transactions, coa, selectedMonth, selectedYear]);

  if (loading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={40} /><p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Menyusun Laporan Keuangan...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pusat Laporan Keuangan</h2>
          <p className="text-slate-500 text-sm font-medium">Laporan standar SAK untuk audit dan manajemen</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" size={16} />
              <input type="text" placeholder="Cari data..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500/20 transition-all w-48" />
           </div>
           <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Settings size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Sidebar List */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 space-y-2">
            {[
              { id: 'laba_rugi', title: 'Laporan Laba Rugi', subtitle: 'MONTHLY/ANNUAL', desc: 'Ringkasan pendapatan dan beban operasional', icon: <Calculator size={20} /> },
              { id: 'neraca', title: 'Neraca (Balance Sheet)', subtitle: 'POINT IN TIME', desc: 'Posisi keuangan: Aktiva, Kewajiban, dan Ekuitas', icon: <Layers size={20} /> },
              { id: 'arus_kas', title: 'Laporan Arus Kas', subtitle: 'MONTHLY', desc: 'Aliran dana masuk dan keluar dari operasional, investasi, pendanaan', icon: <RefreshCw size={20} /> },
              { id: 'ekuitas', title: 'Laporan Perubahan Ekuitas', subtitle: 'ANNUAL', desc: 'Ringkasan perubahan modal dan laba ditahan', icon: <Layout size={20} /> }
            ].map(report => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id as ReportType)}
                className={`w-full text-left p-4 rounded-2xl transition-all border group flex items-center justify-between ${
                  activeReport === report.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/10' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                     activeReport === report.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                   }`}>
                     {report.icon}
                   </div>
                   <div>
                     <p className={`font-black text-sm uppercase tracking-wider ${activeReport === report.id ? 'text-blue-700' : 'text-slate-700'}`}>{report.title}</p>
                     <p className="text-[8px] font-black text-slate-400 tracking-[0.2em]">{report.subtitle}</p>
                     <p className="text-[10px] text-slate-500 mt-1 font-medium">{report.desc}</p>
                   </div>
                </div>
                <ChevronRight size={16} className={activeReport === report.id ? 'text-blue-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="xl:col-span-8 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[800px] flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                   <Eye size={16} />
                </div>
                <span className="text-sm font-bold text-slate-600">Preview: Laporan Keuangan</span>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                   <button onClick={() => setTheme('standard')} className={`w-6 h-6 rounded ${theme === 'standard' ? 'bg-blue-600 ring-2 ring-blue-500/20' : 'bg-slate-100 border border-slate-200'}`}></button>
                   <button onClick={() => setTheme('blue')} className={`w-6 h-6 rounded mx-1 ${theme === 'blue' ? 'bg-blue-900 ring-2 ring-blue-900/20' : 'bg-blue-50 border border-blue-200'}`}></button>
                   <button onClick={() => setTheme('dark')} className={`w-6 h-6 rounded ${theme === 'dark' ? 'bg-slate-900 ring-2 ring-slate-900/20' : 'bg-slate-800 border border-slate-700'}`}></button>
                </div>

                <div className="h-6 w-px bg-slate-200"></div>

                <div className="flex gap-2">
                   <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"><Printer size={18}/></button>
                   <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"><Download size={18}/></button>
                </div>
             </div>
          </div>

          <div className="p-4 bg-white border-b border-slate-100 flex justify-end gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                <Calendar size={14} className="text-slate-400" />
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 outline-none">
                   {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 outline-none">
                   {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          </div>

          {/* Actual Report Document */}
          <div className="flex-1 p-12 bg-slate-50/30 overflow-y-auto flex justify-center">
            <div className={`w-full max-w-4xl bg-white shadow-2xl rounded-sm border border-slate-200 p-16 font-serif ${
              theme === 'blue' ? 'border-t-8 border-blue-900' : theme === 'dark' ? 'border-t-8 border-slate-900' : 'border-t-8 border-blue-600'
            }`}>
               <div className="text-center mb-16">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-widest uppercase">PDAM SERUYAN</h1>
                  <p className="text-sm text-slate-500 italic mt-2">Periode {months[selectedMonth]} {selectedYear}</p>
                  <div className="w-24 h-1 bg-slate-900 mx-auto mt-6"></div>
               </div>

               {activeReport === 'laba_rugi' && (
                 <div className="space-y-12">
                   <section>
                     <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Pendapatan Operasional</h3>
                     <div className="space-y-3 px-4">
                       {reportData.pendapatan.map(p => (
                         <div key={p.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                           <span className="text-sm text-slate-700">{p.name}</span>
                           <span className="text-sm font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                         </div>
                       ))}
                       <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                         <span className="text-sm uppercase">Total Pendapatan</span>
                         <span className="text-sm underline decoration-double">{formatCurrency(reportData.totalPendapatan)}</span>
                       </div>
                     </div>
                   </section>

                   <section>
                     <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Beban Operasional</h3>
                     <div className="space-y-3 px-4">
                       {reportData.beban.map(b => (
                         <div key={b.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                           <span className="text-sm text-slate-700">{b.name}</span>
                           <span className="text-sm font-bold text-slate-800">-{formatCurrency(b.amount)}</span>
                         </div>
                       ))}
                       <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                         <span className="text-sm uppercase">Total Beban Operasional</span>
                         <span className="text-sm underline decoration-double">{formatCurrency(reportData.totalBeban)}</span>
                       </div>
                     </div>
                   </section>

                   <div className="pt-12">
                      <div className="flex justify-between items-center py-6 px-8 border-2 border-slate-900 bg-slate-50">
                         <h4 className="text-lg font-bold uppercase tracking-widest">Laba/Rugi Berjalan</h4>
                         <span className={`text-xl font-bold ${reportData.labaBersih >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                           {formatCurrency(reportData.labaBersih)}
                         </span>
                      </div>
                   </div>
                 </div>
               )}

               {activeReport === 'neraca' && (
                 <div className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section>
                         <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Aktiva (Aset)</h3>
                         <div className="space-y-3 px-2">
                           {reportData.aset.map(a => (
                             <div key={a.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                               <span className="text-xs text-slate-700">{a.name}</span>
                               <span className="text-xs font-bold text-slate-800">{formatCurrency(a.amount)}</span>
                             </div>
                           ))}
                           <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                             <span className="text-xs uppercase">Total Aktiva</span>
                             <span className="text-xs underline decoration-double">{formatCurrency(reportData.totalAset)}</span>
                           </div>
                         </div>
                      </section>

                      <section>
                         <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Pasiva (Kewajiban & Ekuitas)</h3>
                         <div className="space-y-6">
                            <div className="space-y-3 px-2">
                               <p className="text-[10px] font-bold text-slate-400 italic">Kewajiban</p>
                               {reportData.kewajiban.map(k => (
                                 <div key={k.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                   <span className="text-xs text-slate-700">{k.name}</span>
                                   <span className="text-xs font-bold text-slate-800">{formatCurrency(k.amount)}</span>
                                 </div>
                               ))}
                            </div>
                            <div className="space-y-3 px-2">
                               <p className="text-[10px] font-bold text-slate-400 italic">Ekuitas</p>
                               {reportData.ekuitas.map(e => (
                                 <div key={e.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                   <span className="text-xs text-slate-700">{e.name}</span>
                                   <span className="text-xs font-bold text-slate-800">{formatCurrency(e.amount)}</span>
                                 </div>
                               ))}
                               <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1 italic">
                                 <span className="text-xs text-blue-600">Laba Berjalan</span>
                                 <span className="text-xs font-bold text-blue-700">{formatCurrency(reportData.labaBersih)}</span>
                               </div>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900 px-2">
                               <span className="text-xs uppercase">Total Pasiva</span>
                               <span className="text-xs underline decoration-double">{formatCurrency(reportData.totalKewajiban + reportData.totalEkuitas)}</span>
                            </div>
                         </div>
                      </section>
                   </div>
                 </div>
               )}

               {activeReport === 'arus_kas' && (
                 <div className="space-y-12">
                   <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Arus Kas dari Aktivitas Operasional</h3>
                      <div className="space-y-3 px-4">
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Laba Bersih Berjalan</span>
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(reportData.labaBersih)}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 italic mt-4">Penyesuaian non-kas:</p>
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Depresiasi & Amortisasi (Estimasi)</span>
                          <span className="text-sm font-bold text-slate-800">Rp 0</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                          <span className="text-sm uppercase">Total Kas dari Operasional</span>
                          <span className="text-sm underline">{formatCurrency(reportData.arusOperasional)}</span>
                        </div>
                      </div>
                   </section>

                   <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Arus Kas dari Aktivitas Investasi</h3>
                      <div className="space-y-3 px-4">
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Perolehan Aset Tetap</span>
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(reportData.arusInvestasi)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                          <span className="text-sm uppercase">Total Kas dari Investasi</span>
                          <span className="text-sm underline">{formatCurrency(reportData.arusInvestasi)}</span>
                        </div>
                      </div>
                   </section>

                   <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Arus Kas dari Aktivitas Pendanaan</h3>
                      <div className="space-y-3 px-4">
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Perubahan Kewajiban & Ekuitas</span>
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(reportData.arusPendanaan)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-4 border-t border-slate-900">
                          <span className="text-sm uppercase">Total Kas dari Pendanaan</span>
                          <span className="text-sm underline">{formatCurrency(reportData.arusPendanaan)}</span>
                        </div>
                      </div>
                   </section>

                   <div className="pt-12">
                      <div className="flex justify-between items-center py-6 px-8 border-2 border-slate-900 bg-blue-50">
                         <h4 className="text-lg font-bold uppercase tracking-widest">Kenaikan/Penurunan Kas Bersih</h4>
                         <span className={`text-xl font-bold ${reportData.kenaikanKas >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                           {formatCurrency(reportData.kenaikanKas)}
                         </span>
                      </div>
                   </div>
                 </div>
               )}

               {activeReport === 'ekuitas' && (
                 <div className="space-y-12">
                   <section>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Rincian Perubahan Ekuitas</h3>
                      <div className="space-y-6 px-4">
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Saldo Awal Ekuitas</span>
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(reportData.totalEkuitas - reportData.labaBersih)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Laba Bersih Periode Berjalan</span>
                          <span className="text-sm font-bold text-emerald-600">+{formatCurrency(reportData.labaBersih)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                          <span className="text-sm text-slate-700">Prive / Penarikan Modal</span>
                          <span className="text-sm font-bold text-slate-400">(Rp 0)</span>
                        </div>
                        <div className="pt-8 flex justify-between items-center py-6 px-8 border-2 border-slate-900 bg-slate-50">
                          <h4 className="text-lg font-bold uppercase tracking-widest">Saldo Akhir Ekuitas</h4>
                          <span className="text-xl font-bold text-slate-900">{formatCurrency(reportData.totalEkuitas)}</span>
                        </div>
                      </div>
                   </section>
                 </div>
               )}

               {/* Signature Section */}
               <div className="mt-32 grid grid-cols-2 gap-20 text-center">
                  <div className="space-y-20">
                     <p className="text-sm text-slate-900">Menyetujui,<br/><span className="font-bold">DIREKTUR UTAMA</span></p>
                     <div className="border-t border-slate-900 w-48 mx-auto"></div>
                  </div>
                  <div className="space-y-20">
                     <p className="text-sm text-slate-900">Kuala Pembuang, {new Date().toLocaleDateString('id-ID')}<br/><span className="font-bold">MANAGER KEUANGAN</span></p>
                     <div className="border-t border-slate-900 w-48 mx-auto"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


