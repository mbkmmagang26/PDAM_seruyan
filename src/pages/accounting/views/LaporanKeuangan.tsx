import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { BarChart3, Loader2, Download } from 'lucide-react';

export default function LaporanKeuangan() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'laba_rugi' | 'neraca'>('laba_rugi');

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
    // 4 = Pendapatan, 5 = Beban, 1 = Aset, 2 = Kewajiban, 3 = Ekuitas
    const grouped: Record<string, number> = {};
    
    coa.forEach(c => grouped[c.code] = 0);

    transactions.forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = 0;
      
      const isAssetOrExpense = t.category.startsWith('1') || t.category.startsWith('5');
      const debit = t.type === 'income' ? t.amount : 0;
      const kredit = t.type === 'expense' ? t.amount : 0;
      
      if (isAssetOrExpense) {
        grouped[t.category] += (debit - kredit);
      } else {
        grouped[t.category] += (kredit - debit);
      }
    });

    // Laba Rugi
    const pendapatan = coa.filter(c => c.code.startsWith('4')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const beban = coa.filter(c => c.code.startsWith('5')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const totalPendapatan = pendapatan.reduce((sum, item) => sum + item.amount, 0);
    const totalBeban = beban.reduce((sum, item) => sum + item.amount, 0);
    const labaBersih = totalPendapatan - totalBeban;

    // Neraca
    const aset = coa.filter(c => c.code.startsWith('1')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const kewajiban = coa.filter(c => c.code.startsWith('2')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    const ekuitas = coa.filter(c => c.code.startsWith('3')).map(c => ({ ...c, amount: grouped[c.code] || 0 }));
    
    const totalAset = aset.reduce((sum, item) => sum + item.amount, 0);
    const totalKewajiban = kewajiban.reduce((sum, item) => sum + item.amount, 0);
    const totalEkuitas = ekuitas.reduce((sum, item) => sum + item.amount, 0) + labaBersih; // Laba ditahan masuk ke ekuitas

    return {
      pendapatan, beban, totalPendapatan, totalBeban, labaBersih,
      aset, kewajiban, ekuitas, totalAset, totalKewajiban, totalEkuitas
    };
  }, [transactions, coa]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Laporan...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h2>
          <p className="text-slate-500">Ringkasan Laba Rugi dan Neraca Saldo.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download size={18} /> Cetak / Export PDF
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button 
          onClick={() => setReportType('laba_rugi')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${reportType === 'laba_rugi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Laporan Laba Rugi
        </button>
        <button 
          onClick={() => setReportType('neraca')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${reportType === 'neraca' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Neraca (Balance Sheet)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest">SIA PDAM SERUYAN</h1>
          <h2 className="text-lg font-bold text-slate-600 uppercase">
            {reportType === 'laba_rugi' ? 'Laporan Laba Rugi' : 'Neraca'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Untuk periode yang berakhir saat ini</p>
        </div>

        {reportType === 'laba_rugi' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-emerald-700 border-b-2 border-emerald-100 pb-2 mb-4">Pendapatan</h3>
              {reportData.pendapatan.map(p => (
                <div key={p.id} className="flex justify-between py-2 text-slate-700 border-b border-slate-50 border-dashed">
                  <span className="pl-4">{p.code} - {p.name}</span>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-slate-800 font-bold bg-slate-50 px-4 mt-2 rounded-lg">
                <span>Total Pendapatan</span>
                <span className="text-emerald-700">{formatCurrency(reportData.totalPendapatan)}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg text-rose-700 border-b-2 border-rose-100 pb-2 mb-4 mt-8">Beban Pokok & Operasional</h3>
              {reportData.beban.map(b => (
                <div key={b.id} className="flex justify-between py-2 text-slate-700 border-b border-slate-50 border-dashed">
                  <span className="pl-4">{b.code} - {b.name}</span>
                  <span className="font-medium">{formatCurrency(b.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-slate-800 font-bold bg-slate-50 px-4 mt-2 rounded-lg">
                <span>Total Beban</span>
                <span className="text-rose-700">{formatCurrency(reportData.totalBeban)}</span>
              </div>
            </div>

            <div className="flex justify-between py-4 text-xl font-black text-white bg-slate-800 px-6 mt-8 rounded-xl shadow-md">
              <span>Laba Bersih (Net Income)</span>
              <span className={reportData.labaBersih >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatCurrency(reportData.labaBersih)}
              </span>
            </div>
          </div>
        )}

        {reportType === 'neraca' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Aset */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-blue-700 border-b-2 border-blue-100 pb-2 mb-4 uppercase">Aset (Aktiva)</h3>
              {reportData.aset.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-slate-700 text-sm">
                  <span>{a.code} - {a.name}</span>
                  <span className="font-medium">{formatCurrency(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-slate-800 font-bold bg-blue-50 px-4 mt-4 rounded-lg">
                <span>Total Aset</span>
                <span className="text-blue-700">{formatCurrency(reportData.totalAset)}</span>
              </div>
            </div>

            {/* Kewajiban & Ekuitas */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-purple-700 border-b-2 border-purple-100 pb-2 mb-4 uppercase">Kewajiban & Ekuitas (Pasiva)</h3>
              
              <h4 className="font-bold text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">Kewajiban</h4>
              {reportData.kewajiban.map(k => (
                <div key={k.id} className="flex justify-between py-1.5 text-slate-700 text-sm">
                  <span>{k.code} - {k.name}</span>
                  <span className="font-medium">{formatCurrency(k.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-slate-800 font-bold text-sm">
                <span>Total Kewajiban</span>
                <span>{formatCurrency(reportData.totalKewajiban)}</span>
              </div>

              <h4 className="font-bold text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded mt-6">Ekuitas</h4>
              {reportData.ekuitas.map(e => (
                <div key={e.id} className="flex justify-between py-1.5 text-slate-700 text-sm">
                  <span>{e.code} - {e.name}</span>
                  <span className="font-medium">{formatCurrency(e.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 text-slate-700 text-sm italic border-b border-slate-200 pb-3">
                <span>Laba Tahun Berjalan</span>
                <span className="font-medium">{formatCurrency(reportData.labaBersih)}</span>
              </div>
              
              <div className="flex justify-between py-2 text-slate-800 font-bold text-sm">
                <span>Total Ekuitas</span>
                <span>{formatCurrency(reportData.totalEkuitas)}</span>
              </div>

              <div className="flex justify-between py-3 text-slate-800 font-bold bg-purple-50 px-4 mt-8 rounded-lg">
                <span>Total Pasiva</span>
                <span className="text-purple-700">{formatCurrency(reportData.totalKewajiban + reportData.totalEkuitas)}</span>
              </div>
            </div>

            {/* Balancce Checker */}
            <div className="col-span-1 md:col-span-2 mt-8 text-center border-t border-slate-200 pt-6">
              <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm ${
                reportData.totalAset === (reportData.totalKewajiban + reportData.totalEkuitas) 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
              }`}>
                Neraca {reportData.totalAset === (reportData.totalKewajiban + reportData.totalEkuitas) ? 'Seimbang (Balanced)' : 'Tidak Seimbang (Unbalanced)'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
