import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToPDF } from '../../../lib/utils';
import { BarChart3, Loader2, Download, Printer, FileText, ChevronRight, Calculator, PieChart, Share2, Eye, Calendar, Settings, Layout, Layers, RefreshCw, Search, X, CheckCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image';

type ReportType = 'laba_rugi' | 'ekuitas' | 'neraca' | 'arus_kas' | 'rincian';

export default function LaporanKeuangan() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType>('laba_rugi');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [searchTerm, setSearchTerm] = useState('');
  const [masterData, setMasterData] = useState({
    inventory: 0,
    assets: 0,
    assetsByCat: {} as Record<string, number>,
    debt: 0,
    receivable: 0
  });

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    const unsubTx = onSnapshot(query(collection(db, 'jurnal_transaksi_keuangan')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCoa = onSnapshot(query(collection(db, 'coa')), (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Sync Master Data for Report Integration
    const unsubInv = onSnapshot(collection(db, 'stok_material_pipa'), (s) => {
      const total = s.docs.reduce((sum, doc) => sum + ((doc.data().price || 0) * (doc.data().stock || 0)), 0);
      setMasterData(prev => ({ ...prev, inventory: total }));
    });
    const unsubAssets = onSnapshot(collection(db, 'inventaris_aset_tetap'), (s) => {
      const total = s.docs.reduce((sum, doc) => sum + (doc.data().acquisitionCost || 0), 0);
      const byCat: Record<string, number> = {};
      s.docs.forEach(doc => {
        const d = doc.data();
        byCat[d.category] = (byCat[d.category] || 0) + (d.acquisitionCost || 0);
      });
      setMasterData(prev => ({ ...prev, assets: total, assetsByCat: byCat }));
    });
    const unsubVendors = onSnapshot(collection(db, 'mitra_vendor_pemasok'), (s) => {
      const total = s.docs.reduce((sum, doc) => sum + (doc.data().balance || 0), 0);
      setMasterData(prev => ({ ...prev, debt: total }));
    });
    const unsubCustomers = onSnapshot(collection(db, 'data_pelanggan_meteran'), (s) => {
      const total = s.docs.reduce((sum, doc) => sum + (doc.data().balance || 0), 0);
      setMasterData(prev => ({ ...prev, receivable: total }));
    });

    return () => { clearTimeout(timer);  unsubTx(); unsubCoa(); unsubInv(); unsubAssets(); unsubVendors(); unsubCustomers(); };
  }, []);

  const reportData = useMemo(() => {
    // Filter transactions up to the end of the selected month/year for Balance Sheet (Cumulative)
    const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
    endOfPeriod.setHours(23, 59, 59, 999);
    
    const cumulativeTx = transactions.filter(t => {
      if (!t.date) return false;
      if (t.status === 'rejected') return false;
      const txDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      return txDate <= endOfPeriod;
    });

    // Filter transactions specifically for the selected month/year for Income Statement (Period-specific)
    const periodTx = transactions.filter(t => {
      if (!t.date) return false;
      if (t.status === 'rejected') return false;
      const txDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
    });

    const calculateBalances = (txList: any[], isForRevenue = false) => {
      const balances: Record<string, number> = {};
      coa.forEach(c => { if (c.code) balances[c.code] = 0; });
      
      // Cari akun Pendapatan utama (kode 4.x) untuk mencatat billing revenue
      const revenueAccCode = coa.find(c => c.code && c.code.startsWith('4') && c.level === 3)?.code ||
                             coa.find(c => c.code && c.code.startsWith('4'))?.code;
      
      txList.forEach(t => {
        // Entri Utama (Debit/Kredit)
        if (t.category) {
          if (balances[t.category] === undefined) balances[t.category] = 0;
          
          const acc = coa.find(c => c.code === t.category);
          const typeStr = acc ? acc.type : (t.category.startsWith('1') ? 'ASSET' : t.category.startsWith('2') ? 'LIABILITY' : t.category.startsWith('3') ? 'EQUITY' : t.category.startsWith('4') ? 'REVENUE' : 'EXPENSE');
          const isAssetOrExpense = typeStr === 'ASSET' || typeStr === 'EXPENSE';

          let debit = 0;
          let kredit = 0;

          if (t.type === 'income') {
             debit = t.amount || 0;
          } else if (t.type === 'expense') {
             kredit = t.amount || 0;
          } else {
             debit = t.amount || 0;
          }

          if (t.authorId === 'system-billing') {
            debit = t.amount || 0;
            kredit = 0;
            
            // Catat juga sebagai Pendapatan (Kredit akun Revenue) agar muncul di Laba Rugi
            if (revenueAccCode) {
              if (balances[revenueAccCode] === undefined) balances[revenueAccCode] = 0;
              balances[revenueAccCode] += t.amount || 0; // Revenue bertambah
            }
          }
          
          if (isAssetOrExpense) balances[t.category] += (debit - kredit);
          else balances[t.category] += (kredit - debit);
        }

        if (t.contraEntry && t.contraEntry.category) {
          const cCat = t.contraEntry.category;
          if (balances[cCat] === undefined) balances[cCat] = 0;
          
          const acc = coa.find(c => c.code === cCat);
          const typeStr = acc ? acc.type : (cCat.startsWith('1') ? 'ASSET' : cCat.startsWith('2') ? 'LIABILITY' : cCat.startsWith('3') ? 'EQUITY' : cCat.startsWith('4') ? 'REVENUE' : 'EXPENSE');
          const cIsAssetOrExpense = typeStr === 'ASSET' || typeStr === 'EXPENSE';

          let cDebit = 0;
          let cKredit = 0;

          if (t.type === 'income') {
             cKredit = t.contraEntry.amount || 0;
          } else if (t.type === 'expense') {
             cDebit = t.contraEntry.amount || 0;
          } else {
             cKredit = t.contraEntry.amount || 0;
          }

          // Override khusus untuk data dari system-billing
          if (t.authorId === 'system-billing') {
            cDebit = 0;
            cKredit = t.contraEntry.amount || 0; // Piutang berkurang (Kredit)
          }
          
          if (cIsAssetOrExpense) balances[cCat] += (cDebit - cKredit);
          else balances[cCat] += (cKredit - cDebit);
        }
      });
      return balances;
    };

    const cumulativeBalances = calculateBalances(cumulativeTx);
    const periodBalances = calculateBalances(periodTx);

    // Injeksi akun yang tidak ada di master COA tapi memiliki saldo (Manual Journal Entries)
    Object.keys(cumulativeBalances).forEach(code => {
      if (!coa.find(c => c.code === code) && Math.abs(cumulativeBalances[code]) > 0.01) {
        coa.push({
          id: code,
          code: code,
          name: 'Akun ' + code + ' (Tidak Terdaftar)',
          type: code.startsWith('1') ? 'ASSET' : code.startsWith('2') ? 'LIABILITY' : code.startsWith('3') ? 'EQUITY' : code.startsWith('4') ? 'REVENUE' : 'EXPENSE',
          level: code.split('.').length > 2 ? 3 : 2
        });
      }
    });

    // Sync Master Data for Integration (Neraca)
    let totalInjectedAssets = 0;
    let totalInjectedLiabilities = 0;

    coa.forEach(c => {
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '');
      
      // Persediaan
      if (name.includes('persediaan') && masterData.inventory > 0) {
        cumulativeBalances[code] = (cumulativeBalances[code] || 0) + masterData.inventory;
        totalInjectedAssets += masterData.inventory;
      }
      
      // Aset Tetap Mapping
      if (code.startsWith('1.3')) {
        let injected = 0;
        if (name.includes('tanah') && masterData.assetsByCat['Tanah']) {
          injected = masterData.assetsByCat['Tanah'];
        } else if ((name.includes('bangunan') || name.includes('instalasi')) && masterData.assetsByCat['Bangunan Air / Instalasi']) {
          injected = masterData.assetsByCat['Bangunan Air / Instalasi'];
        } else if ((name.includes('peralatan') || name.includes('mesin')) && masterData.assetsByCat['Peralatan & Mesin']) {
          injected = masterData.assetsByCat['Peralatan & Mesin'];
        } else if (name.includes('aset tetap') && !name.includes('akumulasi')) {
           const mappedTotal = (masterData.assetsByCat['Tanah'] || 0) + (masterData.assetsByCat['Bangunan Air / Instalasi'] || 0) + (masterData.assetsByCat['Peralatan & Mesin'] || 0);
           if (masterData.assets - mappedTotal > 0) {
             injected = (masterData.assets - mappedTotal);
           }
        }
        if (injected > 0) {
          cumulativeBalances[code] = (cumulativeBalances[code] || 0) + injected;
          totalInjectedAssets += injected;
        }
      }

      // Hutang
      if ((name.includes('hutang') || name.includes('utang')) && masterData.debt > 0) {
        cumulativeBalances[code] = (cumulativeBalances[code] || 0) + masterData.debt;
        totalInjectedLiabilities += masterData.debt;
      }
    });

    // Menyeimbangkan Neraca akibat injeksi Master Data
    const netInjection = totalInjectedAssets - totalInjectedLiabilities;
    if (netInjection > 0) {
      const equityAccount = coa.find(c => c.code && c.code.startsWith('3') && c.level === 3) || coa.find(c => c.code && c.code.startsWith('3'));
      if (equityAccount) {
        cumulativeBalances[equityAccount.code] = (cumulativeBalances[equityAccount.code] || 0) + netInjection;
      }
    }

    // Laba Rugi Data (Period-specific)
    const getAccType = (c: any) => c.type || (c.code?.startsWith('1') ? 'ASSET' : c.code?.startsWith('2') ? 'LIABILITY' : c.code?.startsWith('3') ? 'EQUITY' : c.code?.startsWith('4') ? 'REVENUE' : 'EXPENSE');

    const pendapatan = coa.filter(c => c.code && getAccType(c) === 'REVENUE').map(c => ({ ...c, amount: periodBalances[c.code] || 0 }));
    const beban = coa.filter(c => c.code && getAccType(c) === 'EXPENSE').map(c => ({ ...c, amount: periodBalances[c.code] || 0 }));
    const totalPendapatan = pendapatan.reduce((sum, item) => sum + item.amount, 0);
    const totalBeban = beban.reduce((sum, item) => sum + item.amount, 0);
    const labaBersih = totalPendapatan - totalBeban;

    // Neraca Data (Cumulative)
    const aset = coa.filter(c => c.code && getAccType(c) === 'ASSET').map(c => ({ ...c, amount: cumulativeBalances[c.code] || 0 }));
    const kewajiban = coa.filter(c => c.code && getAccType(c) === 'LIABILITY').map(c => ({ ...c, amount: cumulativeBalances[c.code] || 0 }));
    const ekuitas = coa.filter(c => c.code && getAccType(c) === 'EQUITY').map(c => ({ ...c, amount: cumulativeBalances[c.code] || 0 }));
    const totalAset = aset.reduce((sum, item) => sum + item.amount, 0);
    const totalKewajiban = kewajiban.reduce((sum, item) => sum + item.amount, 0);
    
    // Laba ditahan dari periode sebelumnya + laba berjalan
    // Simplified: in this system, since it's a single table, all historical profit is already in 'Ekuitas' codes if handled correctly,
    // but here we add current period labaBersih to ekuitas for the Balance Sheet to balance.
    const totalEkuitas = ekuitas.reduce((sum, item) => sum + item.amount, 0) + labaBersih;

    // Arus Kas Data (Refined)
    // 1. Arus Kas Operasional = Laba Bersih + Depresiasi (Estimasi) + Perubahan Modal Kerja
    const arusOperasional = labaBersih; 
    
    // 2. Arus Kas Investasi = Perubahan Aset Tetap (1.3.x)
    const asetTetapCodes = coa.filter(c => c.code && c.code.startsWith('1.3')).map(c => c.code);
    const totalAsetTetap = asetTetapCodes.reduce((sum, code) => sum + (cumulativeBalances[code] || 0), 0);
    // Note: Simplified logic for "change" in assets
    const arusInvestasi = -totalAsetTetap; 

    // 3. Arus Kas Pendanaan = Perubahan Kewajiban & Ekuitas (Excl. Laba Berjalan)
    const arusPendanaan = totalKewajiban + (totalEkuitas - labaBersih); 

    const kenaikanKas = arusOperasional + arusInvestasi + arusPendanaan;

    return {
      pendapatan, beban, totalPendapatan, totalBeban, labaBersih,
      aset, kewajiban, ekuitas, totalAset, totalKewajiban, totalEkuitas,
      arusOperasional, arusInvestasi, arusPendanaan, kenaikanKas
    };
  }, [transactions, coa, selectedMonth, selectedYear]);

  const handleDownloadPDF = () => {
    handleExport();
  };

  const handleExport = () => {
    let data: any[] = [];
    let filename = `Laporan_${activeReport}_${months[selectedMonth]}_${selectedYear}`;

    if (activeReport === 'laba_rugi') {
      data = [
        ...reportData.pendapatan.map(p => ({ Kategori: 'Pendapatan', Nama: p.name, Nilai: p.amount })),
        { Kategori: 'Total Pendapatan', Nama: '', Nilai: reportData.totalPendapatan },
        ...reportData.beban.map(b => ({ Kategori: 'Beban', Nama: b.name, Nilai: b.amount })),
        { Kategori: 'Total Beban', Nama: '', Nilai: reportData.totalBeban },
        { Kategori: 'Laba Bersih', Nama: '', Nilai: reportData.labaBersih }
      ];
    } else if (activeReport === 'neraca') {
      data = [
        ...reportData.aset.map(a => ({ Kategori: 'Aset', Nama: a.name, Nilai: a.amount })),
        { Kategori: 'Total Aset', Nama: '', Nilai: reportData.totalAset },
        ...reportData.kewajiban.map(k => ({ Kategori: 'Kewajiban', Nama: k.name, Nilai: k.amount })),
        { Kategori: 'Total Kewajiban', Nama: '', Nilai: reportData.totalKewajiban },
        ...reportData.ekuitas.map(e => ({ Kategori: 'Ekuitas', Nama: e.name, Nilai: e.amount })),
        { Kategori: 'Laba Berjalan', Nama: '', Nilai: reportData.labaBersih },
        { Kategori: 'Total Pasiva', Nama: '', Nilai: reportData.totalKewajiban + reportData.totalEkuitas }
      ];
    } else {
      // Arus kas & ekuitas simplified export
      data = [{ Pesan: 'Ekspor detail tersedia pada Buku Besar' }];
    }

    exportToPDF(data, filename);
  };

  if (loading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={40} /><p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Menyusun Laporan Keuangan...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <style>{`
        @media print {
          body * { visibility: hidden; background: white !important; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
          @page { size: auto; margin: 10mm; }
        }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Pusat Laporan Keuangan</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Laporan standar SAK untuk audit dan manajemen</p>
        </div>
        <div className="flex items-center gap-4">
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Sidebar List */}
        <div className="xl:col-span-4 space-y-4 no-print">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 shadow-sm p-4 space-y-2">
            {[
              { id: 'laba_rugi', title: 'Laporan Laba Rugi', subtitle: 'MONTHLY/ANNUAL', desc: 'Ringkasan pendapatan dan beban operasional', icon: <Calculator size={20} /> },
              { id: 'ekuitas', title: 'Laporan Perubahan Ekuitas', subtitle: 'ANNUAL', desc: 'Ringkasan perubahan modal dan laba ditahan', icon: <Layout size={20} /> },
              { id: 'neraca', title: 'Neraca (Balance Sheet)', subtitle: 'POINT IN TIME', desc: 'Posisi keuangan: Aktiva, Kewajiban, dan Ekuitas', icon: <Layers size={20} /> },
              { id: 'arus_kas', title: 'Laporan Arus Kas', subtitle: 'MONTHLY', desc: 'Aliran dana masuk dan keluar dari operasional, investasi, pendanaan', icon: <RefreshCw size={20} /> },
              { id: 'rincian', title: 'Rincian Saldo Akun', subtitle: 'DETAIL SCHEDULE', desc: 'Rincian saldo buku pembantu per akun level 3', icon: <FileText size={20} /> }
            ].map(report => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id as ReportType)}
                className={`w-full text-left p-4 rounded-2xl transition-all border group flex items-center justify-between ${
                  activeReport === report.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-500/10' 
                  : 'bg-white dark:bg-slate-800 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 hover:border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                     activeReport === report.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                   }`}>
                     {report.icon}
                   </div>
                   <div>
                     <p className={`font-black text-sm uppercase tracking-wider ${activeReport === report.id ? 'text-blue-700' : 'text-slate-700 dark:text-slate-200'}`}>{report.title}</p>
                     <p className="text-[8px] font-black text-slate-400 tracking-[0.2em]">{report.subtitle}</p>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{report.desc}</p>
                   </div>
                </div>
                <ChevronRight size={16} className={activeReport === report.id ? 'text-blue-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[800px] flex flex-col no-print-container">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                   <Eye size={16} />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Preview: Laporan Keuangan</span>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={loading}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200 disabled:opacity-50" 
                      title="Download PDF"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    </button>
                 </div>
             </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 flex justify-end gap-3 no-print">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100">
                <Calendar size={14} className="text-slate-400" />
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
                   {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
                   {Array.from({ length: new Date().getFullYear() - 2024 + 21 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          </div>

          {/* Actual Report Document — Multi-page A4 Preview */}
          <div className="flex-1 overflow-y-auto bg-slate-200 py-8 px-4 flex flex-col items-center gap-6">
            
            {/* --- REPORT PAGES --- */}
            {(() => {
               // HELPER COMPONENTS
               const ReportHeader = () => (
                 <div className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                      <img src="/logo-pdam.png" alt="Logo PDAM" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-widest uppercase">PDAM SERUYAN</h1>
                    <h2 className="text-lg font-bold text-slate-700 tracking-wider mt-2">
                      {activeReport === 'laba_rugi' && 'Laporan Laba Rugi'}
                      {activeReport === 'ekuitas' && 'Laporan Perubahan Ekuitas'}
                      {activeReport === 'neraca' && 'Neraca'}
                      {activeReport === 'arus_kas' && 'Laporan Arus Kas'}
                      {activeReport === 'rincian' && 'Rincian Saldo Akun'}
                    </h2>
                    <p className="text-sm text-slate-500 italic mt-2">Periode {months[selectedMonth]} {selectedYear}</p>
                    <div className="w-24 h-1 bg-slate-900 mx-auto mt-6 mb-6"></div>
                    
                    {activeReport === 'neraca' && (
                      <div className="no-print flex justify-center">
                        {Math.abs(reportData.totalAset - (reportData.totalKewajiban + reportData.totalEkuitas)) < 0.1 ? (
                          <span className="px-4 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle size={14} /> STATUS INTEGRITAS: NERACA VALID & SEIMBANG
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle size={14} /> PERINGATAN INTEGRITAS: SELISIH BALANCE ({formatCurrency(Math.abs(reportData.totalAset - (reportData.totalKewajiban + reportData.totalEkuitas)))})
                          </span>
                        )}
                      </div>
                    )}
                 </div>
               );

               const ReportSignature = () => (
                 <div className="mt-auto grid grid-cols-2 gap-12 text-center pt-8 pb-2">
                   <div className="space-y-16">
                     <p className="text-sm text-slate-900">Menyetujui,<br/><span className="font-bold">DIREKTUR UTAMA</span></p>
                     <div className="border-t border-slate-900 w-48 mx-auto"></div>
                   </div>
                   <div className="space-y-16">
                     <p className="text-sm text-slate-900">Kuala Pembuang, {new Date().toLocaleDateString('id-ID')}<br/><span className="font-bold">MANAGER KEUANGAN</span></p>
                     <div className="border-t border-slate-900 w-48 mx-auto"></div>
                   </div>
                 </div>
               );

               const ReportFooter = ({ pageNum, hasSignature }: { pageNum: number, hasSignature?: boolean }) => (
                 <div className={`${hasSignature ? 'mt-4' : 'mt-auto'} pt-6 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono`}>
                   <span>PDAM Seruyan — Laporan Keuangan</span>
                   <span>Halaman {pageNum}</span>
                 </div>
               );

               // NERACA REPORT (Paginated)
               if (activeReport === 'neraca') {
                  const ITEMS_PER_PAGE = 25;
                  const pasivaItems = [
                     { type: 'header', name: 'Kewajiban' },
                     ...reportData.kewajiban.map(k => ({...k, type: 'kewajiban'})),
                     { type: 'header', name: 'Ekuitas' },
                     ...reportData.ekuitas.map(e => ({...e, type: 'ekuitas'})),
                     { type: 'laba', name: 'Laba Berjalan', amount: reportData.labaBersih }
                  ];
                  
                  const maxLen = Math.max(reportData.aset.length, pasivaItems.length);
                  const pagesCount = Math.ceil(maxLen / ITEMS_PER_PAGE) || 1;
                  
                  return Array.from({ length: pagesCount }).map((_, pageIdx) => {
                     const isLast = pageIdx === pagesCount - 1;
                     const asetChunk = reportData.aset.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);
                     const pasivaChunk = pasivaItems.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);

                     return (
                        <div key={`neraca-${pageIdx}`} className="w-full max-w-[794px] flex flex-col gap-2">
                           <div className="text-xs text-slate-400 font-bold tracking-widest uppercase self-start ml-4">Halaman {pageIdx + 1}</div>
                           <div className="print-area w-full h-[1123px] bg-white shadow-2xl border border-slate-300 p-12 font-serif border-t-8 border-blue-600 flex flex-col relative overflow-hidden">
                               {pageIdx === 0 && <ReportHeader />}
                               
                               <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 ${pageIdx > 0 ? 'mt-4' : 'mt-8'}`}>
                                   <section>
                                       {pageIdx === 0 && <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Aktiva (Aset)</h3>}
                                       <div className="space-y-3 px-2">
                                           {asetChunk.map(a => (
                                              <div key={a.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                                <span className="text-[11px] text-black truncate pr-2" title={a.name}>{a.name}</span>
                                                <span className="text-[11px] font-bold text-black">{formatCurrency(a.amount)}</span>
                                              </div>
                                          ))}
                                          {isLast && (
                                              <div className="flex justify-between font-bold text-black pt-4 border-t border-black mt-4">
                                                 <span className="text-[11px] uppercase">Total Aktiva</span>
                                                 <span className="text-[11px] underline decoration-double">{formatCurrency(reportData.totalAset)}</span>
                                              </div>
                                          )}
                                       </div>
                                   </section>

                                   <section>
                                       {pageIdx === 0 && <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Pasiva (Kewajiban & Ekuitas)</h3>}
                                       <div className="space-y-3 px-2">
                                          {pasivaChunk.map((p, i) => {
                                              if (p.type === 'header') return <p key={`h-${i}`} className="text-[10px] font-bold text-black italic mt-4 mb-1">{p.name}</p>;
                                              if (p.type === 'laba') return (
                                                 <div key="laba" className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1 italic mt-4">
                                                   <span className="text-[11px] font-bold text-black">{p.name}</span>
                                                   <span className={`text-[11px] font-bold ${p.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(p.amount)}</span>
                                                </div>
                                              );
                                              return (
                                                  <div key={p.id || i} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                                    <span className="text-[11px] text-black truncate pr-2" title={p.name}>{p.name}</span>
                                                    <span className="text-[11px] font-bold text-black">{formatCurrency(p.amount)}</span>
                                                  </div>
                                              )
                                          })}
                                          {isLast && (
                                              <div className="flex justify-between font-bold text-black pt-4 border-t border-black mt-4">
                                                 <span className="text-[11px] uppercase">Total Pasiva</span>
                                                 <span className="text-[11px] underline decoration-double">{formatCurrency(reportData.totalKewajiban + reportData.totalEkuitas)}</span>
                                              </div>
                                          )}
                                       </div>
                                   </section>
                               </div>

                               {isLast && <ReportSignature />}
                               <ReportFooter pageNum={pageIdx + 1} hasSignature={isLast} />
                           </div>
                        </div>
                     );
                  });
               }

               // RINCIAN REPORT (Paginated)
               if (activeReport === 'rincian') {
                  const ITEMS_PER_PAGE = 32;
                  const rincianItems = coa.filter(c => c.level === 3);
                  const pagesCount = Math.ceil(rincianItems.length / ITEMS_PER_PAGE) || 1;
                  
                  return Array.from({ length: pagesCount }).map((_, pageIdx) => {
                     const isLast = pageIdx === pagesCount - 1;
                     const chunk = rincianItems.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);

                     return (
                        <div key={`rincian-${pageIdx}`} className="w-full max-w-[794px] flex flex-col gap-2">
                           <div className="text-xs text-slate-400 font-bold tracking-widest uppercase self-start ml-4">Halaman {pageIdx + 1}</div>
                           <div className="print-area w-full h-[1123px] bg-white shadow-2xl border border-slate-300 p-12 font-serif border-t-8 border-blue-600 flex flex-col relative overflow-hidden">
                               {pageIdx === 0 && <ReportHeader />}
                               
                               <div className={`flex-1 ${pageIdx > 0 ? 'mt-4' : 'mt-8'}`}>
                                 <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Rincian Saldo Akun (Buku Pembantu) {pageIdx > 0 && '(Lanjutan)'}</h3>
                                 <div className="space-y-3 px-4">
                                   {pageIdx === 0 && (
                                       <div className="flex justify-between font-bold text-slate-400 border-b border-slate-200 pb-2 text-xs uppercase tracking-wider">
                                         <span>Akun (COA)</span>
                                         <span>Saldo Akhir</span>
                                       </div>
                                   )}
                                   {chunk.map(c => {
                                     const val = reportData.aset.find(a => a.code === c.code)?.amount ||
                                                 reportData.kewajiban.find(k => k.code === c.code)?.amount ||
                                                 reportData.ekuitas.find(e => e.code === c.code)?.amount ||
                                                 reportData.pendapatan.find(p => p.code === c.code)?.amount ||
                                                 reportData.beban.find(b => b.code === c.code)?.amount || 0;
                                     return (
                                       <div key={c.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                         <div className="text-sm truncate pr-4">
                                           <span className="font-mono text-slate-400 mr-2">{c.code}</span>
                                           <span className="text-slate-700 font-medium">{c.name}</span>
                                         </div>
                                         <span className="text-sm font-bold text-slate-800 shrink-0">{formatCurrency(val)}</span>
                                       </div>
                                     );
                                   })}
                                 </div>
                               </div>

                               {isLast && <ReportSignature />}
                               <ReportFooter pageNum={pageIdx + 1} hasSignature={isLast} />
                           </div>
                        </div>
                     );
                  });
               }

               // OTHER REPORTS (Single Page)
               return (
                  <div className="w-full max-w-[794px] flex flex-col gap-2">
                     <div className="text-xs text-slate-400 font-bold tracking-widest uppercase self-start ml-4">Halaman 1</div>
                     <div className="print-area w-full min-h-[1123px] bg-white shadow-2xl border border-slate-300 p-16 font-serif border-t-8 border-blue-600 flex flex-col relative overflow-hidden">
                        <ReportHeader />

                        {activeReport === 'laba_rugi' && (
                          <div className="space-y-12">
                            <section>
                              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-4">Pendapatan Operasional</h3>
                              <div className="space-y-3 px-4">
                                {reportData.pendapatan.map(p => (
                                  <div key={p.id} className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                    <span className="text-sm text-black">{p.name}</span>
                                    <span className="text-sm font-bold text-black">{formatCurrency(p.amount)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between font-bold text-black pt-4 border-t border-black">
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
                                    <span className="text-sm text-black">{b.name}</span>
                                    <span className="text-sm font-bold text-black">-{formatCurrency(b.amount)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between font-bold text-black pt-4 border-t border-black">
                                  <span className="text-sm uppercase">Total Beban Operasional</span>
                                  <span className="text-sm underline decoration-double">{formatCurrency(reportData.totalBeban)}</span>
                                </div>
                              </div>
                            </section>

                            <div className="pt-12">
                               <div className="flex justify-between items-center py-6 px-8 border-2 border-black bg-slate-50">
                                  <h4 className="text-lg font-bold uppercase tracking-widest text-black">Laba/Rugi Berjalan</h4>
                                  <span className={`text-xl font-bold ${reportData.labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(reportData.labaBersih)}
                                  </span>
                               </div>
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
                               <div className="flex justify-between items-center py-6 px-8 border-2 border-black bg-slate-50">
                                  <h4 className="text-lg font-bold uppercase tracking-widest text-black">Kenaikan/Penurunan Kas Bersih</h4>
                                  <span className={`text-xl font-bold ${reportData.kenaikanKas >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(reportData.kenaikanKas)}
                                  </span>
                               </div>
                            </div>
                          </div>
                        )}

                        {activeReport === 'ekuitas' && (
                          <div className="space-y-12">
                            <section>
                               <h3 className="font-bold text-sm uppercase tracking-wider text-black border-b border-slate-200 pb-2 mb-4">Rincian Perubahan Ekuitas</h3>
                               <div className="space-y-6 px-4">
                                 <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                   <span className="text-sm text-black">Saldo Awal Ekuitas</span>
                                   <span className="text-sm font-bold text-black">{formatCurrency(reportData.totalEkuitas - reportData.labaBersih)}</span>
                                 </div>
                                 <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                   <span className="text-sm text-black">Laba/Rugi Periode Berjalan</span>
                                   <span className={`text-sm font-bold ${reportData.labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{reportData.labaBersih >= 0 ? '+' : ''}{formatCurrency(reportData.labaBersih)}</span>
                                 </div>
                                 <div className="flex justify-between items-end border-b border-slate-100 border-dotted pb-1">
                                   <span className="text-sm text-black">Prive / Penarikan Modal</span>
                                   <span className="text-sm font-bold text-black">(Rp 0)</span>
                                 </div>
                                 <div className="pt-8 flex justify-between items-center py-6 px-8 border-2 border-black bg-slate-50">
                                   <h4 className="text-lg font-bold uppercase tracking-widest text-black">Saldo Akhir Ekuitas</h4>
                                   <span className="text-xl font-bold text-black">{formatCurrency(reportData.totalEkuitas)}</span>
                                 </div>
                               </div>
                             </section>
                          </div>
                        )}

                        <ReportSignature />
                        <ReportFooter pageNum={1} hasSignature={true} />
                     </div>
                  </div>
               );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
}




