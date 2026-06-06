import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { ShieldCheck, Loader2, CheckCircle, HelpCircle, AlertTriangle, Calculator, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../authContext';
import { sendNotification } from '../../../lib/notifications';

export default function RekonsiliasiView() {
  const { user } = useAuth();
  const [coa, setCoa] = useState<any[]>([]);
  const [lppList, setLppList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [physicalCashInput, setPhysicalCashInput] = useState<Record<string, string>>({});
  const [selectedLpp, setSelectedLpp] = useState<any>(null);
  
  // Denomination calculator state for cash counting modal
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '100000': 0, '50000': 0, '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0
  });
  const [showCalcModal, setShowCalcModal] = useState(false);

  useEffect(() => {
    // Listen to COA
    const qCoa = query(collection(db, 'coa'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to pending LPP uploads
    const qLpp = query(collection(db, 'lpp_uploads'), where('status', '==', 'pending'));
    const unsubLpp = onSnapshot(qLpp, (snapshot) => {
      setLppList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubCoa(); unsubLpp(); };
  }, []);

  const getAccount = (codePrefix: string, fallbackName: string) => {
    const matched = coa.find(c => c.code && c.code.startsWith(codePrefix) && c.level === 3);
    return matched ? matched.code : codePrefix;
  };

  const piutangAccount = getAccount('1.1.3', 'Piutang Air');
  const dendaAccount = getAccount('4.1.2', 'Pendapatan Denda/Non-Air');

  const getKasAccountForLoket = (type: string) => {
    if (type === 'koperasi') return getAccount('1.1.1.02', 'Kas Koperasi');
    if (type === 'cabang') return getAccount('1.1.1.03', 'Kas Cabang');
    return getAccount('1.1.1.01', 'Kas Loket Kantor'); // kantor/default
  };

  const handlePhysicalCashChange = (id: string, value: string) => {
    setPhysicalCashInput(prev => ({ ...prev, [id]: value }));
  };

  const calculateTotalDenominations = () => {
    return Object.entries(denominations).reduce((sum, [denom, qty]) => sum + (Number(denom) * qty), 0);
  };

  const applyCalculatorValue = () => {
    if (selectedLpp) {
      handlePhysicalCashChange(selectedLpp.id, String(calculateTotalDenominations()));
    }
    setShowCalcModal(false);
    // Reset denominations
    setDenominations({
      '100000': 0, '50000': 0, '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0
    });
  };

  const handleApproveAndLock = async (lpp: any) => {
    const cashVal = Number(physicalCashInput[lpp.id]) || 0;
    const diff = cashVal - lpp.totalPenerimaan;

    if (diff !== 0) {
      alert('Total uang fisik harus MATCH dengan total LPP agar dapat dikunci dan dibukukan!');
      return;
    }

    if (!confirm(`Setujui & Kunci LPP untuk ${lpp.cashierName} tanggal ${lpp.date}? Transaksi akan dicatat permanen ke Jurnal Umum.`)) return;

    try {
      const kasAccount = getKasAccountForLoket(lpp.loketType);
      const refNo = `LPP-${lpp.date}-${lpp.loketType.toUpperCase()}`;
      const desc = `Penerimaan Kasir ${lpp.cashierName} (${lpp.loketType.toUpperCase()}) tgl ${lpp.date}`;

      // 1. Update LPP status to locked
      await updateDoc(doc(db, 'lpp_uploads', lpp.id), {
        status: 'locked',
        physicalCash: cashVal,
        difference: diff,
        approvedBy: user?.name || 'Supervisor',
        approvedAt: serverTimestamp()
      });

      // 2. Post Jurnal (Double-Entry)
      // Debit Kas Loket
      await addDoc(collection(db, 'transactions'), {
        date: lpp.date,
        reference: refNo,
        description: desc,
        category: kasAccount,
        type: 'income', // Debit
        amount: lpp.totalPenerimaan,
        status: 'posted',
        isLocked: true, // Permanent lock
        createdAt: serverTimestamp(),
        authorId: user?.id || 'system',
        authorName: user?.name || 'Supervisor'
      });

      // Kredit Piutang Air
      if (lpp.totalAir > 0) {
        await addDoc(collection(db, 'transactions'), {
          date: lpp.date,
          reference: refNo,
          description: desc,
          category: piutangAccount,
          type: 'expense', // Kredit
          amount: lpp.totalAir,
          status: 'posted',
          isLocked: true,
          createdAt: serverTimestamp(),
          authorId: user?.id || 'system',
          authorName: user?.name || 'Supervisor'
        });
      }

      // Kredit Pendapatan Denda / Non-Air
      const totalKreditNonAir = (lpp.totalDenda || 0) + (lpp.totalNonAir || 0);
      if (totalKreditNonAir > 0) {
        await addDoc(collection(db, 'transactions'), {
          date: lpp.date,
          reference: refNo,
          description: desc,
          category: dendaAccount,
          type: 'expense', // Kredit
          amount: totalKreditNonAir,
          status: 'posted',
          isLocked: true,
          createdAt: serverTimestamp(),
          authorId: user?.id || 'system',
          authorName: user?.name || 'Supervisor'
        });
      }

      // Send notifications
      await sendNotification({
        title: 'LPP Berhasil Direkonsiliasi',
        message: `LPP ${lpp.cashierName} tgl ${lpp.date} telah dikunci & diposting ke Buku Besar.`,
        type: 'success'
      });

      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { title: 'Rekonsiliasi Sukses!', message: 'BKM Kas Penerimaan LPP telah diposting.', type: 'success' }
      }));

    } catch (err: any) {
      alert('Gagal merekonsiliasi: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Antrean Rekonsiliasi...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">End of Day (EOD) & Rekonsiliasi</h2>
          <p className="text-slate-500 text-sm">Otorisasi dan pencocokan uang fisik dengan total penerimaan kasir harian.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Daftar Antrean Rekonsiliasi Kasir</h3>
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{lppList.length} Menunggu Otorisasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Loket & Kasir</th>
                <th className="p-4 text-right">Total LPP (Sistem)</th>
                <th className="p-4 text-right">Uang Fisik (Cash)</th>
                <th className="p-4 text-right">Selisih</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lppList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic">
                    Semua penerimaan kasir telah direkonsiliasi & dikunci dengan aman.
                  </td>
                </tr>
              ) : lppList.map((lpp) => {
                const physicalCash = Number(physicalCashInput[lpp.id]) || 0;
                const diff = physicalCash - lpp.totalPenerimaan;
                const isMatch = diff === 0;

                return (
                  <tr key={lpp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 font-medium">{lpp.date}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{lpp.cashierName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lpp.loketType}</p>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(lpp.totalPenerimaan)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedLpp(lpp); setShowCalcModal(true); }}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Buka Kalkulator Denominasi Uang"
                        >
                          <Calculator size={16} />
                        </button>
                        <input 
                          type="number" 
                          placeholder="Nilai Kas..."
                          value={physicalCashInput[lpp.id] || ''}
                          onChange={e => handlePhysicalCashChange(lpp.id, e.target.value)}
                          className="w-36 p-2 rounded-xl border border-slate-200 text-right font-bold focus:border-blue-500 outline-none"
                        />
                      </div>
                    </td>
                    <td className={`p-4 text-right font-bold ${diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff === 0 ? 'Rp 0' : formatCurrency(diff)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        isMatch && physicalCash > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isMatch && physicalCash > 0 ? 'MATCH' : 'UNMATCHED'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        disabled={!isMatch || physicalCash === 0}
                        onClick={() => handleApproveAndLock(lpp)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ml-auto shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Lock size={14} /> Approve & Lock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Denomination Calculator Modal */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800">Kalkulator Kas Fisik</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Hitung Uang Denominasi Rupiah</p>
              </div>
              <button onClick={() => setShowCalcModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Tutup</button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {Object.keys(denominations).map(denom => (
                <div key={denom} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-slate-600 w-24">{formatCurrency(Number(denom))}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">x</span>
                    <input 
                      type="number" 
                      min="0"
                      value={denominations[denom] || ''} 
                      onChange={e => setDenominations({ ...denominations, [denom]: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-20 p-2 border border-slate-200 rounded-xl text-center font-bold"
                    />
                  </div>
                  <span className="font-bold text-slate-700 w-28 text-right">
                    {formatCurrency(Number(denom) * (denominations[denom] || 0))}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Terhitung</p>
                <p className="text-lg font-black text-blue-600">{formatCurrency(calculateTotalDenominations())}</p>
              </div>
              <button 
                onClick={applyCalculatorValue}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                Terapkan Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
