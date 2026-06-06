import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, TrendingUp, Download, Filter, CheckCircle2, Clock, Plus, Search, X, Users } from 'lucide-react';
import { useLanguage } from '../../languageContext';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, where } from 'firebase/firestore';
import { processPayment } from '../../lib/billingUtils';
import { useAuth } from '../../authContext';
import { logActivity } from '../../lib/logger';

export default function Billing() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bills, setBills] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const [isAddingBill, setIsAddingBill] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [newBillForm, setNewBillForm] = useState({
    customerId: '',
    customerName: '',
    periodeBulan: new Date().toLocaleString('id-ID', { month: 'long' }),
    periodeTahun: new Date().getFullYear().toString(),
    totalTagihan: ''
  });

  useEffect(() => {
    let q = query(collection(db, 'tb_billing'), orderBy('createdAt', 'desc'));
    
    if (filterMonth !== 'all' && filterYear !== 'all') {
      q = query(
        collection(db, 'tb_billing'),
        where('periodeBulan', '==', filterMonth),
        where('periodeTahun', '==', filterYear),
        orderBy('createdAt', 'desc')
      );
    } else if (filterMonth !== 'all') {
      q = query(
        collection(db, 'tb_billing'),
        where('periodeBulan', '==', filterMonth),
        orderBy('createdAt', 'desc')
      );
    } else if (filterYear !== 'all') {
      q = query(
        collection(db, 'tb_billing'),
        where('periodeTahun', '==', filterYear),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setBills(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error in Billing query:", error);
    });
    return () => unsub();
  }, [filterMonth, filterYear]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tb_pelanggan'), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
          logActivity(user, 'Proses Pembayaran', `Pembayaran tagihan sebesar Rp ${amount} untuk pelanggan ${customerId} berhasil diproses.`);
        }
      } catch (err) {
        alert('Terjadi kesalahan saat memproses pembayaran.');
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillForm.customerId) {
      alert('Pilih pelanggan terlebih dahulu!');
      return;
    }
    
    try {
      await addDoc(collection(db, 'tb_billing'), {
        customerId: newBillForm.customerId,
        customerName: newBillForm.customerName,
        periodeBulan: newBillForm.periodeBulan,
        periodeTahun: newBillForm.periodeTahun,
        totalTagihan: Number(newBillForm.totalTagihan),
        amount: Number(newBillForm.totalTagihan),
        status: 'unpaid',
        createdAt: new Date().toISOString()
      });
      alert('Tagihan berhasil dibuat dan dikirim ke pelanggan.');
      logActivity(user, 'Buat Tagihan', `Tagihan baru sebesar Rp ${newBillForm.totalTagihan} dibuat untuk pelanggan ${newBillForm.customerName}.`);
      setIsAddingBill(false);
      setNewBillForm({
        customerId: '',
        customerName: '',
        periodeBulan: new Date().toLocaleString('id-ID', { month: 'long' }),
        periodeTahun: new Date().getFullYear().toString(),
        totalTagihan: ''
      });
      setSearchQuery('');
    } catch (err) {
      alert('Gagal membuat tagihan.');
    }
  };

  const totalRevenue = bills.filter(b => b.status === 'paid').reduce((acc, curr) => acc + (curr.totalTagihan || curr.amount || 0), 0);

  return (
    <div className="space-y-8 relative">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-headline font-bold">{t('admin.billing.title')}</h2>
          <p className="text-sm text-slate-500">{t('admin.billing.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="all">Semua Bulan</option>
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="all">Semua Tahun</option>
            {['2023', '2024', '2025', '2026', '2027'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            <Download size={16} />
            {t('user.billing.download')}
          </button>
          <button 
            onClick={() => setIsAddingBill(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00478d] text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Plus size={16} />
            Buat Tagihan
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

      {/* Add Bill Modal */}
      <AnimatePresence>
        {isAddingBill && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingBill(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
            >
              <div className="p-10 pb-6 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-headline font-bold text-slate-800">Buat Tagihan Baru</h3>
                  <p className="text-sm text-slate-500 font-medium">Kirimkan invoice ke aplikasi pelanggan</p>
                </div>
                <button onClick={() => setIsAddingBill(false)} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddBill} className="p-10 space-y-6">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-500 ml-1">Pilih Pelanggan</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari Nama Pelanggan atau No. Meter..."
                      value={searchQuery}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium pr-10"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={18} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-[70] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                      >
                        <div className="max-h-60 overflow-y-auto">
                          {customers.filter(c =>
                            (c.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.no_meter || '').toLowerCase().includes(searchQuery.toLowerCase())
                          ).length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic">Pelanggan tidak ditemukan</div>
                          ) : (
                            customers.filter(c =>
                              (c.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (c.no_meter || '').toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setNewBillForm({
                                    ...newBillForm,
                                    customerId: c.id,
                                    customerName: c.nama || 'Pelanggan',
                                  });
                                  setSearchQuery(c.nama || c.id);
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
                              >
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{c.nama || 'Pelanggan'}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{c.alamat || 'No Address'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-[#00478d]">METER: {c.no_meter || '-'}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Periode Bulan</label>
                    <select 
                      required
                      value={newBillForm.periodeBulan}
                      onChange={e => setNewBillForm({ ...newBillForm, periodeBulan: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Periode Tahun</label>
                    <select
                      required
                      value={newBillForm.periodeTahun}
                      onChange={e => setNewBillForm({ ...newBillForm, periodeTahun: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      {[2023, 2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Total Tagihan (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="Contoh: 50000"
                    value={newBillForm.totalTagihan} 
                    onChange={e => setNewBillForm({ ...newBillForm, totalTagihan: e.target.value })} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingBill(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-wider text-xs">Batal</button>
                  <button type="submit" className="flex-[2] py-4 bg-[#00478d] text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-wider text-xs bg-gradient-to-r from-primary to-[#005cbb]">Kirim Tagihan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

