import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { Book, Loader2, Filter } from 'lucide-react';

export default function BukuBesar() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoa, setSelectedCoa] = useState<string>('');

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'asc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      const coaData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoa(coaData);
      if (coaData.length > 0 && !selectedCoa) {
        setSelectedCoa(coaData[0].code);
      }
    });

    return () => { unsubTx(); unsubCoa(); };
  }, [selectedCoa]);

  const ledgerData = useMemo(() => {
    if (!selectedCoa) return [];
    
    let currentBalance = 0;
    const isAssetOrExpense = selectedCoa.startsWith('1') || selectedCoa.startsWith('5');
    
    const accountTx = transactions.filter(t => t.category === selectedCoa);
    
    return accountTx.map(t => {
      const debit = t.type === 'income' ? t.amount : 0;
      const kredit = t.type === 'expense' ? t.amount : 0;
      
      // Saldo Normal: Aset & Beban bertambah di Debit. Kewajiban, Ekuitas, Pendapatan bertambah di Kredit.
      if (isAssetOrExpense) {
        currentBalance += (debit - kredit);
      } else {
        currentBalance += (kredit - debit);
      }

      return {
        ...t,
        debit,
        kredit,
        balance: currentBalance
      };
    });
  }, [transactions, selectedCoa]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Buku Besar...</div>;

  const currentAccount = coa.find(c => c.code === selectedCoa);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Buku Besar (General Ledger)</h2>
          <p className="text-slate-500">Buku besar merangkum transaksi berdasarkan akun.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Book className="text-blue-600" />
          <span className="font-bold text-slate-700">Pilih Akun COA:</span>
        </div>
        <select 
          value={selectedCoa} 
          onChange={e => setSelectedCoa(e.target.value)}
          className="w-full sm:w-96 p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium"
        >
          {coa.map(c => (
            <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
          ))}
        </select>
        <button className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium text-sm ml-auto">
          <Filter size={18} /> Filter Periode
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">
            Riwayat Transaksi: <span className="text-blue-600">{currentAccount?.name || '-'}</span>
          </h3>
          <span className="text-sm font-bold text-slate-500">Saldo Normal: {selectedCoa.startsWith('1') || selectedCoa.startsWith('5') ? 'Debit' : 'Kredit'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-right">Debit (Rp)</th>
                <th className="p-4 text-right">Kredit (Rp)</th>
                <th className="p-4 text-right">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerData.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada transaksi pada akun ini.</td></tr>
              ) : ledgerData.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600">{t.date}</td>
                  <td className="p-4 font-medium text-slate-800">{t.description}</td>
                  <td className="p-4 text-right text-slate-600">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                  <td className="p-4 text-right text-slate-600">{t.kredit > 0 ? formatCurrency(t.kredit) : '-'}</td>
                  <td className="p-4 text-right font-black text-slate-800">{formatCurrency(t.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
