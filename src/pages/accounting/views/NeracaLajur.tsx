import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToPDF } from '../../../lib/utils';
import { Search, Loader2, Download, Table, RefreshCw, Calendar } from 'lucide-react';

export default function NeracaLajurView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    // Listen to COA
    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      const coaData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        const codeParts = (data.code || '').split('.');
        const level = data.level ? Number(data.level) : (codeParts.length > 0 ? codeParts.length : 1);
        return { id: doc.id, ...data, level };
      });
      setCoa(coaData);
    });

    // Listen to Transactions
    const qTx = query(collection(db, 'jurnal_transaksi_keuangan'), orderBy('date', 'asc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { clearTimeout(timer);  unsubCoa(); unsubTx(); };
  }, []);

  // Compute Neraca Lajur Data
  const worksheetData = useMemo(() => {
    const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
    
    // Filter transactions up to the end of the selected period
    const filteredTx = transactions.filter(t => {
      if (!t.date) return false;
      if (t.status === 'rejected') return false;
      const txDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      return txDate <= endOfPeriod;
    });

    // Separate normal vs adjustment transactions
    const balances: Record<string, {
      nsDebit: number; nsKredit: number;
      adjDebit: number; adjKredit: number;
    }> = {};

    coa.forEach(c => {
      if (c.code) {
        balances[c.code] = { nsDebit: 0, nsKredit: 0, adjDebit: 0, adjKredit: 0 };
      }
    });

    // Cari kode akun Revenue (4.x) untuk mapping system-billing
    const revenueAccCode = coa.find(c => c.code && c.code.startsWith('4') && c.level === 3)?.code ||
                           coa.find(c => c.code && c.code.startsWith('4'))?.code;

    filteredTx.forEach(t => {
      const isAdjustment = (t.reference || '').toUpperCase().includes('ADJ') || 
                           (t.description || '').toLowerCase().includes('penyesuaian');

      // Tentukan debit/kredit berdasarkan tipe transaksi (standar akuntansi)
      let debit = t.type === 'expense' ? (t.amount || 0) : 0;
      let kredit = t.type === 'income' ? (t.amount || 0) : 0;

      // Override untuk system-billing: Kas (Debit) + Pendapatan (Kredit)
      if (t.authorId === 'system-billing') {
        debit = t.amount || 0; // Kas masuk (Debit)
        kredit = 0;
        // Catat pendapatan ke akun revenue
        if (revenueAccCode) {
          if (!balances[revenueAccCode]) balances[revenueAccCode] = { nsDebit: 0, nsKredit: 0, adjDebit: 0, adjKredit: 0 };
          if (isAdjustment) balances[revenueAccCode].adjKredit += t.amount || 0;
          else balances[revenueAccCode].nsKredit += t.amount || 0;
        }
      }

      // Catat ke akun kategori utama
      if (t.category && balances[t.category] !== undefined) {
        if (isAdjustment) {
          balances[t.category].adjDebit += debit;
          balances[t.category].adjKredit += kredit;
        } else {
          balances[t.category].nsDebit += debit;
          balances[t.category].nsKredit += kredit;
        }
      }

      // Catat ke akun contra (lawan)
      if (t.contraEntry && t.contraEntry.category && balances[t.contraEntry.category] !== undefined) {
        const cDebit = t.authorId === 'system-billing' ? 0 : (t.contraEntry.type === 'income' ? (t.contraEntry.amount || 0) : 0);
        const cKredit = t.authorId === 'system-billing' ? (t.contraEntry.amount || 0) : (t.contraEntry.type === 'expense' ? (t.contraEntry.amount || 0) : 0);
        if (isAdjustment) {
          balances[t.contraEntry.category].adjDebit += cDebit;
          balances[t.contraEntry.category].adjKredit += cKredit;
        } else {
          balances[t.contraEntry.category].nsDebit += cDebit;
          balances[t.contraEntry.category].nsKredit += cKredit;
        }
      }
    });

    // Allocate adjusted values
    let totalNSDebit = 0;
    let totalNSKredit = 0;
    let totalAdjDebit = 0;
    let totalAdjKredit = 0;
    let totalLRDebit = 0;
    let totalLRKredit = 0;
    let totalNDebit = 0;
    let totalNKredit = 0;

    const rows = coa.filter(c => !c.isHeader && (c.level >= 3 || (c.code && (c.code.split('.').length >= 3 || c.code.split('-').length >= 3)) || !c.level)).map(c => {
      const code = c.code;
      const b = balances[code] || { nsDebit: 0, nsKredit: 0, adjDebit: 0, adjKredit: 0 };
      
      const isAssetOrExpense = code.startsWith('1') || code.startsWith('5');
      
      // Calculate Neraca Saldo Net values
      let nsDebit = 0;
      let nsKredit = 0;
      if (isAssetOrExpense) {
        const net = b.nsDebit - b.nsKredit;
        if (net > 0) nsDebit = net;
        else nsKredit = Math.abs(net);
      } else {
        const net = b.nsKredit - b.nsDebit;
        if (net > 0) nsKredit = net;
        else nsDebit = Math.abs(net);
      }

      // Adjustment columns
      const adjDebit = b.adjDebit;
      const adjKredit = b.adjKredit;

      // Adjusted Trial Balance (Neraca Saldo Disesuaikan)
      let nsdDebit = 0;
      let nsdKredit = 0;
      if (isAssetOrExpense) {
        const net = (nsDebit - nsKredit) + (adjDebit - adjKredit);
        if (net > 0) nsdDebit = net;
        else nsdKredit = Math.abs(net);
      } else {
        const net = (nsKredit - nsDebit) + (adjKredit - adjDebit);
        if (net > 0) nsdKredit = net;
        else nsdDebit = Math.abs(net);
      }

      // Allocations to Laba Rugi or Neraca
      let lrDebit = 0;
      let lrKredit = 0;
      let nDebit = 0;
      let nKredit = 0;

      const isLabaRugiAccount = code.startsWith('4') || code.startsWith('5');

      if (isLabaRugiAccount) {
        lrDebit = nsdDebit;
        lrKredit = nsdKredit;
      } else {
        nDebit = nsdDebit;
        nKredit = nsdKredit;
      }

      // Accumulate totals
      totalNSDebit += nsDebit;
      totalNSKredit += nsKredit;
      totalAdjDebit += adjDebit;
      totalAdjKredit += adjKredit;
      totalLRDebit += lrDebit;
      totalLRKredit += lrKredit;
      totalNDebit += nDebit;
      totalNKredit += nKredit;

      return {
        code,
        name: c.name,
        nsDebit, nsKredit,
        adjDebit, adjKredit,
        nsdDebit, nsdKredit,
        lrDebit, lrKredit,
        nDebit, nKredit
      };
    });

    // Net Income / Loss Calculation
    const netIncomeLR = totalLRKredit - totalLRDebit;
    
    // Balancing line
    let lrBalancingDebit = 0;
    let lrBalancingKredit = 0;
    let nBalancingDebit = 0;
    let nBalancingKredit = 0;

    if (netIncomeLR >= 0) {
      lrBalancingDebit = netIncomeLR; // Place in Debit to balance Laba Rugi
      nBalancingKredit = netIncomeLR; // Place in Kredit to balance Neraca (Equity Increase)
    } else {
      lrBalancingKredit = Math.abs(netIncomeLR); // Place in Kredit to balance Laba Rugi
      nBalancingDebit = Math.abs(netIncomeLR); // Place in Debit to balance Neraca
    }

    return {
      rows,
      totals: {
        nsDebit: totalNSDebit, nsKredit: totalNSKredit,
        adjDebit: totalAdjDebit, adjKredit: totalAdjKredit,
        nsdDebit: totalNSDebit + totalAdjDebit, nsdKredit: totalNSKredit + totalAdjKredit, // Simplified
        lrDebit: totalLRDebit, lrKredit: totalLRKredit,
        nDebit: totalNDebit, nKredit: totalNKredit
      },
      balancing: {
        netIncome: netIncomeLR,
        lrBalancingDebit, lrBalancingKredit,
        nBalancingDebit, nBalancingKredit
      }
    };
  }, [transactions, coa, selectedMonth, selectedYear]);

  const handleExport = () => {
    const dataToExport = worksheetData.rows.map(r => ({
      'Kode Akun': r.code,
      'Nama Akun': r.name,
      'NS Debit': r.nsDebit,
      'NS Kredit': r.nsKredit,
      'Adj Debit': r.adjDebit,
      'Adj Kredit': r.adjKredit,
      'LR Debit': r.lrDebit,
      'LR Kredit': r.lrKredit,
      'Neraca Debit': r.nDebit,
      'Neraca Kredit': r.nKredit
    }));
    exportToPDF(dataToExport, `Neraca_Lajur_${months[selectedMonth]}_${selectedYear}`);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Menyiapkan Neraca Lajur...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Neraca Lajur (Worksheet 10-Kolom)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Lembar kerja akuntansi komprehensif penutupan periode keuangan.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <div className="w-px h-3 bg-slate-200 mx-1"></div>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
              {Array.from({ length: new Date().getFullYear() - 2024 + 21 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button 
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 flex items-center justify-center gap-2 font-medium text-sm bg-white dark:bg-slate-800 shadow-sm"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="flex gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari kode atau nama akun..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white dark:bg-slate-800 shadow-sm"
          />
        </div>
      </div>

      {/* Unified Worksheet Table with Sticky Frozen Columns */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap text-right border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
            <tr className="border-b border-slate-200 text-center">
              <th rowSpan={2} className="p-3.5 border-r border-slate-200 text-left sticky left-0 z-20 bg-slate-100 dark:bg-slate-700 min-w-[100px]">
                Kode
              </th>
              <th rowSpan={2} className="p-3.5 border-r border-slate-200 text-left sticky left-[100px] z-20 bg-slate-100 dark:bg-slate-700 min-w-[260px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]">
                Nama Akun
              </th>
              <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-slate-50 dark:bg-slate-900/50">Neraca Saldo</th>
              <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-slate-100 dark:bg-slate-700">Penyesuaian</th>
              <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-slate-50 dark:bg-slate-900/50">Laba / Rugi</th>
              <th colSpan={2} className="p-2.5 bg-slate-100 dark:bg-slate-700">Neraca</th>
            </tr>
            <tr className="border-b border-slate-200">
              <th className="p-2.5 font-bold w-32 border-r border-slate-150">Debit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-200">Kredit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-150">Debit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-200">Kredit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-150">Debit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-200">Kredit</th>
              <th className="p-2.5 font-bold w-32 border-r border-slate-150">Debit</th>
              <th className="p-2.5 font-bold w-32">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {worksheetData.rows.filter(r => r.code.includes(searchTerm) || r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-3 text-left font-bold text-slate-800 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-800 border-r border-slate-100">
                  {r.code}
                </td>
                <td className="p-3 text-left text-slate-700 dark:text-slate-200 font-semibold sticky left-[100px] z-10 bg-white dark:bg-slate-800 border-r border-slate-200 max-w-[18rem] truncate shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]" title={r.name}>
                  {r.name}
                </td>
                <td className="p-3 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.nsDebit > 0 ? formatCurrency(r.nsDebit) : '-'}</td>
                <td className="p-3 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.nsKredit > 0 ? formatCurrency(r.nsKredit) : '-'}</td>
                <td className="p-3 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.adjDebit > 0 ? formatCurrency(r.adjDebit) : '-'}</td>
                <td className="p-3 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.adjKredit > 0 ? formatCurrency(r.adjKredit) : '-'}</td>
                <td className="p-3 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.lrDebit > 0 ? formatCurrency(r.lrDebit) : '-'}</td>
                <td className="p-3 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.lrKredit > 0 ? formatCurrency(r.lrKredit) : '-'}</td>
                <td className="p-3 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.nDebit > 0 ? formatCurrency(r.nDebit) : '-'}</td>
                <td className="p-3 text-slate-600 dark:text-slate-300">{r.nKredit > 0 ? formatCurrency(r.nKredit) : '-'}</td>
              </tr>
            ))}

            {/* Balancing net Income Row */}
            <tr className="bg-slate-50 dark:bg-slate-900/50 font-black border-t border-slate-200">
              <td className="p-3 text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100"></td>
              <td className="p-3 text-left text-blue-600 sticky left-[100px] z-10 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                LABA/RUGI BERJALAN
              </td>
              <td className="p-3 border-r border-slate-150">-</td>
              <td className="p-3 border-r border-slate-200">-</td>
              <td className="p-3 border-r border-slate-150">-</td>
              <td className="p-3 border-r border-slate-200">-</td>
              <td className="p-3 border-r border-slate-150 text-blue-600">{worksheetData.balancing.lrBalancingDebit > 0 ? formatCurrency(worksheetData.balancing.lrBalancingDebit) : '-'}</td>
              <td className="p-3 border-r border-slate-200 text-blue-600">{worksheetData.balancing.lrBalancingKredit > 0 ? formatCurrency(worksheetData.balancing.lrBalancingKredit) : '-'}</td>
              <td className="p-3 border-r border-slate-150 text-blue-600">{worksheetData.balancing.nBalancingDebit > 0 ? formatCurrency(worksheetData.balancing.nBalancingDebit) : '-'}</td>
              <td className="p-3 text-blue-600">{worksheetData.balancing.nBalancingKredit > 0 ? formatCurrency(worksheetData.balancing.nBalancingKredit) : '-'}</td>
            </tr>

            {/* Final Totals Row */}
            <tr className="bg-slate-100 dark:bg-slate-700 font-black border-t-2 border-slate-300">
              <td className="p-3 text-left sticky left-0 z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-200"></td>
              <td className="p-3 text-left text-slate-800 dark:text-white sticky left-[100px] z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                TOTAL BALANCE
              </td>
              <td className="p-3 border-r border-slate-150 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.nsDebit)}</td>
              <td className="p-3 border-r border-slate-200 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.nsKredit)}</td>
              <td className="p-3 border-r border-slate-150 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.adjDebit)}</td>
              <td className="p-3 border-r border-slate-200 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.adjKredit)}</td>
              <td className="p-3 border-r border-slate-150 text-slate-800 dark:text-white">
                {formatCurrency(worksheetData.totals.lrDebit + worksheetData.balancing.lrBalancingDebit)}
              </td>
              <td className="p-3 border-r border-slate-200 text-slate-800 dark:text-white">
                {formatCurrency(worksheetData.totals.lrKredit + worksheetData.balancing.lrBalancingKredit)}
              </td>
              <td className="p-3 border-r border-slate-150 text-slate-800 dark:text-white">
                {formatCurrency(worksheetData.totals.nDebit + worksheetData.balancing.nBalancingDebit)}
              </td>
              <td className="p-3 text-slate-800 dark:text-white">
                {formatCurrency(worksheetData.totals.nKredit + worksheetData.balancing.nBalancingKredit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      </div>
    </div>
  );
}


