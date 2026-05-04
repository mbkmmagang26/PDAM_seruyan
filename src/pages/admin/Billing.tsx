import React from 'react';
import { motion } from 'motion/react';
import { CreditCard, TrendingUp, Download, Filter, ArrowUpRight, CheckCircle2, Clock, Check } from 'lucide-react';
import { useLanguage } from '../../languageContext';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { processPayment } from '../../lib/billingUtils';

export default function Billing() {
  const { t } = useLanguage();
  const [bills, setBills] = React.useState<any[]>([]);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'tb_billing'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBills(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleProcessPayment = async (billId: string, customerId: string, amount: number) => {
    if (window.confirm('Proses pembayaran untuk tagihan ini? (Status akan menjadi Lunas)')) {
      setIsProcessing(billId);
      try {
        const res = await processPayment(billId, customerId, amount);
        if (!res.success) {
          alert(res.message);
        } else {
          alert('Pembayaran berhasil diproses!');
        }
      } catch (err) {
        alert('Terjadi kesalahan saat memproses pembayaran.');
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const totalRevenue = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + (curr.totalTagihan || curr.amount || 0), 0);


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-headline font-bold">{t('admin.billing.title')}</h2>
          <p className="text-sm text-slate-500">{t('admin.billing.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600">
            <Filter size={16} />
            {t('admin.billing.filter')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#00478d] text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
            <Download size={16} />
            {t('user.billing.download')}
          </button>
        </div>
      </header>

      {/* Revenue Card */}
      <section className="bg-gradient-to-br from-[#00478d] to-[#005eb8] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#00478d]/20">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-2">{t('admin.billing.monthly')}</p>
            <h3 className="text-4xl font-headline font-extrabold">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
            <p className="text-sm mt-2 flex items-center gap-1">
              <TrendingUp size={16} />
              <span className="font-bold">+12.4%</span> {t('admin.stats.vs_last_month')}
            </p>
          </div>
          <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
            <CreditCard size={32} />
          </div>
        </div>
      </section>

      {/* Transaction List */}
      <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50">
          <h3 className="font-bold">{t('admin.billing.recent')}</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {bills.length === 0 ? (
            <div className="px-8 py-10 text-center text-slate-400 italic">Belum ada data tagihan</div>
          ) : (
            bills.map((bill) => (
              <motion.div 
                key={bill.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {bill.status === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{bill.customerName || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {bill.periodeBulan} {bill.periodeTahun} • {new Date(bill.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#00478d]">Rp {(bill.totalTagihan || bill.amount || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bill.status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}</p>
                  </div>
                  {bill.status !== 'paid' && (
                    <button 
                      onClick={() => handleProcessPayment(bill.id, bill.customerId, bill.totalTagihan || bill.amount)}
                      disabled={isProcessing === bill.id}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isProcessing === bill.id ? 'Memproses...' : 'Bayar'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
