import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { Search, Loader2, Download, Table, RefreshCw, Calendar } from 'lucide-react';

export default function NeracaLajurView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    // Listen to COA
    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to Transactions
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'asc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubCoa(); unsubTx(); };
  }, []);

  // Compute Neraca Lajur Data
  const worksheetData = useMemo(() => {
    const endOfPeriod = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
    
    // Filter transactions up to the end of the selected period
    const filteredTx = transactions.filter(t => {
      if (!t.date) return false;
      const txDate = new Date(t.date);
      return txDate <= endOfPeriod;
    });

    // Separate normal vs adjustment transactions
    // In our system, transactions with reference containing "ADJ" or description containing "Penyesuaian" are adjustments.
    const balances: Record<string, {
      nsDebit: number; nsKredit: number;
      adjDebit: number; adjKredit: number;
    }> = {};

    coa.forEach(c => {
      if (c.code) {
        balances[c.code] = { nsDebit: 0, nsKredit: 0, adjDebit: 0, adjKredit: 0 };
      }
    });

    filteredTx.forEach(t => {
      if (!t.category || balances[t.category] === undefined) return;
      const isAdjustment = (t.reference || '').toUpperCase().includes('ADJ') || 
                           (t.description || '').toLowerCase().includes('penyesuaian');

      const debit = t.type === 'income' ? t.amount : 0;
      const kredit = t.type === 'expense' ? t.amount : 0;

      if (isAdjustment) {
        balances[t.category].adjDebit += debit;
        balances[t.category].adjKredit += kredit;
      } else {
        balances[t.category].nsDebit += debit;
        balances[t.category].nsKredit += kredit;
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

    const rows = coa.filter(c => c.level === 3).map(c => {
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
    exportToCSV(dataToExport, `Neraca_Lajur_${months[selectedMonth]}_${selectedYear}`);
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
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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

      {/* Worksheet Table Container with Frozen Column Left and Scroll Right */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
        
        {/* Left Side: Frozen Columns (Code and Name) */}
        <div className="border-r border-slate-200 shrink-0 bg-slate-50 dark:bg-slate-900/50/50 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
          <table className="text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider h-[48px]">
              <tr>
                <th className="p-4 border-b border-slate-200">Kode</th>
                <th className="p-4 border-b border-slate-200 w-52">Nama Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {worksheetData.rows.filter(r => r.code.includes(searchTerm) || r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 transition-colors h-[48px]">
                  <td className="p-4 font-bold text-slate-800 dark:text-white">{r.code}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-200 max-w-[13rem] truncate font-semibold" title={r.name}>{r.name}</td>
                </tr>
              ))}
              {/* Balancing/Net Income Label */}
              <tr className="bg-slate-50 dark:bg-slate-900/50 font-black h-[48px] border-t border-slate-200">
                <td className="p-4"></td>
                <td className="p-4 text-blue-600">LABA/RUGI BERJALAN</td>
              </tr>
              {/* Totals Row */}
              <tr className="bg-slate-100 dark:bg-slate-700 font-black h-[48px] border-t-2 border-slate-300">
                <td className="p-4"></td>
                <td className="p-4 text-slate-800 dark:text-white">TOTAL BALANCE</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Side: Scrollable Columns (Debit/Kredit sections) */}
        <div className="overflow-x-auto flex-1 scrollbar-thin">
          <table className="text-right text-sm whitespace-nowrap w-full">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
              {/* Top Headers */}
              <tr className="border-b border-slate-200 text-center">
                <th colSpan={2} className="p-2 border-r border-slate-200 bg-slate-50 dark:bg-slate-900/50">Neraca Saldo</th>
                <th colSpan={2} className="p-2 border-r border-slate-200 bg-slate-100 dark:bg-slate-700">Penyesuaian</th>
                <th colSpan={2} className="p-2 border-r border-slate-200 bg-slate-50 dark:bg-slate-900/50">Laba / Rugi</th>
                <th colSpan={2} className="p-2 bg-slate-100 dark:bg-slate-700">Neraca</th>
              </tr>
              {/* Sub Headers */}
              <tr className="border-b border-slate-200">
                <th className="p-2 font-bold w-32 border-r border-slate-150">Debit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-200">Kredit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-150">Debit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-200">Kredit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-150">Debit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-200">Kredit</th>
                <th className="p-2 font-bold w-32 border-r border-slate-150">Debit</th>
                <th className="p-2 font-bold w-32">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {worksheetData.rows.filter(r => r.code.includes(searchTerm) || r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 transition-colors h-[48px]">
                  <td className="p-2 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.nsDebit > 0 ? formatCurrency(r.nsDebit) : '-'}</td>
                  <td className="p-2 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.nsKredit > 0 ? formatCurrency(r.nsKredit) : '-'}</td>
                  <td className="p-2 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.adjDebit > 0 ? formatCurrency(r.adjDebit) : '-'}</td>
                  <td className="p-2 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.adjKredit > 0 ? formatCurrency(r.adjKredit) : '-'}</td>
                  <td className="p-2 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.lrDebit > 0 ? formatCurrency(r.lrDebit) : '-'}</td>
                  <td className="p-2 border-r border-slate-200 text-slate-600 dark:text-slate-300">{r.lrKredit > 0 ? formatCurrency(r.lrKredit) : '-'}</td>
                  <td className="p-2 border-r border-slate-150 text-slate-600 dark:text-slate-300">{r.nDebit > 0 ? formatCurrency(r.nDebit) : '-'}</td>
                  <td className="p-2 text-slate-600 dark:text-slate-300">{r.nKredit > 0 ? formatCurrency(r.nKredit) : '-'}</td>
                </tr>
              ))}

              {/* Balancing net Income Row */}
              <tr className="bg-slate-50 dark:bg-slate-900/50 font-black h-[48px] border-t border-slate-200">
                {/* NS & Adjustments */}
                <td className="p-2 border-r border-slate-150">-</td>
                <td className="p-2 border-r border-slate-200">-</td>
                <td className="p-2 border-r border-slate-150">-</td>
                <td className="p-2 border-r border-slate-200">-</td>
                {/* LR balancing */}
                <td className="p-2 border-r border-slate-150 text-blue-600">{worksheetData.balancing.lrBalancingDebit > 0 ? formatCurrency(worksheetData.balancing.lrBalancingDebit) : '-'}</td>
                <td className="p-2 border-r border-slate-200 text-blue-600">{worksheetData.balancing.lrBalancingKredit > 0 ? formatCurrency(worksheetData.balancing.lrBalancingKredit) : '-'}</td>
                {/* Neraca balancing */}
                <td className="p-2 border-r border-slate-150 text-blue-600">{worksheetData.balancing.nBalancingDebit > 0 ? formatCurrency(worksheetData.balancing.nBalancingDebit) : '-'}</td>
                <td className="p-2 text-blue-600">{worksheetData.balancing.nBalancingKredit > 0 ? formatCurrency(worksheetData.balancing.nBalancingKredit) : '-'}</td>
              </tr>

              {/* Final Balance Row */}
              <tr className="bg-slate-100 dark:bg-slate-700 font-black h-[48px] border-t-2 border-slate-300">
                {/* NS Totals */}
                <td className="p-2 border-r border-slate-150 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.nsDebit)}</td>
                <td className="p-2 border-r border-slate-200 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.nsKredit)}</td>
                {/* Adj Totals */}
                <td className="p-2 border-r border-slate-150 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.adjDebit)}</td>
                <td className="p-2 border-r border-slate-200 text-slate-800 dark:text-white">{formatCurrency(worksheetData.totals.adjKredit)}</td>
                {/* LR Totals + balancing */}
                <td className="p-2 border-r border-slate-150 text-slate-800 dark:text-white">
                  {formatCurrency(worksheetData.totals.lrDebit + worksheetData.balancing.lrBalancingDebit)}
                </td>
                <td className="p-2 border-r border-slate-200 text-slate-800 dark:text-white">
                  {formatCurrency(worksheetData.totals.lrKredit + worksheetData.balancing.lrBalancingKredit)}
                </td>
                {/* Neraca Totals + balancing */}
                <td className="p-2 border-r border-slate-150 text-slate-800 dark:text-white">
                  {formatCurrency(worksheetData.totals.nDebit + worksheetData.balancing.nBalancingDebit)}
                </td>
                <td className="p-2 text-slate-800 dark:text-white">
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
