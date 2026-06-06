import React, { useState, useMemo, useEffect } from 'react';
import {
  Waves,
  Bell,
  HelpCircle,
  Search,
  Gauge,
  Camera,
  Upload,
  Home,
  Wrench,
  User as UserIcon,
  ChevronLeft,
  CheckCircle2,
  X,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { useTasks } from '../../taskContext';
import { useLanguage } from '../../languageContext';
import { User, MeterReading as MeterReadingType } from '../../types';
import { processMeterReadingAndBilling } from '../../lib/billingUtils';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { logActivity } from '../../lib/logger';

export default function MeterReading() {
  const { allUsers, user: staff, logout } = useAuth();
  const { tasks, updateTaskStatus } = useTasks();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');

  // Logic to determine active customer
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [standAwal, setStandAwal] = useState<number>(0);
  const [loadingAwal, setLoadingAwal] = useState(false);

  const [tbPelanggan, setTbPelanggan] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tb_pelanggan'), (snapshot) => {
      setTbPelanggan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // If taskId exists, auto-select customer from task
  const assignedTask = useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);

  const activeCustomer = useMemo(() => {
    if (assignedTask) {
      return tbPelanggan.find(u => u.id === assignedTask.customerId || u.id === assignedTask.permohonanId);
    }
    return selectedUser;
  }, [assignedTask, selectedUser, tbPelanggan]);

  const customers = useMemo(() => {
    if (!searchTerm) return [];
    return tbPelanggan.filter(c => c.nama?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
  }, [tbPelanggan, searchTerm]);

  useEffect(() => {
    const fetchStandAwal = async () => {
      if (!activeCustomer) return;
      setLoadingAwal(true);
      try {
        const meterQ = query(
          collection(db, 'tb_meter_pelanggan'),
          where('customerId', '==', activeCustomer.id)
        );
        const snap = await getDocs(meterQ);
        if (!snap.empty) {
          const allMeters = snap.docs.map(doc => doc.data() as MeterReadingType);
          // Sort in JavaScript to avoid Firestore composite index requirement
          allMeters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStandAwal(allMeters[0].standAkhir);
        } else {
          setStandAwal(0);
        }
      } catch (err) {
        console.error("Failed to fetch stand awal:", err);
      } finally {
        setLoadingAwal(false);
      }
    };
    fetchStandAwal();
  }, [activeCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !readingValue) return;

    setIsSubmitting(true);

    try {
      const standAkhirVal = Number(readingValue);
      const res = await processMeterReadingAndBilling(
        activeCustomer.id,
        standAkhirVal,
        'https://images.unsplash.com/photo-1590231804368-6c8a3074780d?w=400&h=300&fit=crop'
      );

      if (!res.success) {
        alert(res.message);
        setIsSubmitting(false);
        return;
      }

      if (assignedTask) {
        await updateTaskStatus(assignedTask.id, 'completed', {
          notes: `${t('staff.tabs.reading')} ${readingValue} m3. Total Tagihan Dibuat.`,
          image: 'https://images.unsplash.com/photo-1590231804368-6c8a3074780d?w=400&h=300&fit=crop'
        });
        logActivity(staff, 'Selesai Pencatatan', `Menyelesaikan tugas pencatatan meter ID: ${assignedTask.id}`);
      } else {
        logActivity(staff, 'Pencatatan Manual', `Melakukan pencatatan meter manual untuk pelanggan ID: ${activeCustomer.id}`);
      }
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err) {
      alert("Gagal memproses.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-headline font-bold">{t('staff.reading.success.title')}</h2>
          <p className="text-sm text-slate-500">{t('staff.reading.success.subtitle').replace('{name}', activeCustomer?.nama || '')}</p>
        </div>
        <button
          onClick={() => navigate('/staff')}
          className="w-full bg-slate-900 text-white py-4 rounded-full font-bold shadow-lg"
        >
          {t('staff.disconnection.return')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface pb-24">
      {/* Top Nav */}
      <nav className="flex justify-between items-center px-6 h-16 w-full bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} className="text-[#00478d]" />
          </button>
          <span className="text-lg font-headline font-bold text-[#00478d] tracking-tight">{t('app.name')} Read</span>
        </div>
        <button onClick={logout} className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
          <img src={staff?.avatar} alt="Profile" className="w-full h-full object-cover" />
        </button>
      </nav>

      <main className="px-6 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-headline font-bold tracking-tight text-on-surface mb-2">{t('staff.reading.title')}</h1>
          <p className="text-slate-500 text-sm">{assignedTask ? t('staff.reading.subtitle.assigned') : t('staff.reading.subtitle.manual')}</p>
        </header>

        {!activeCustomer ? (
          <div className="space-y-6">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('staff.reading.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-slate-400 shadow-sm transition-all"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Suggestions</p>
              {customers.map(c => (
                <motion.button
                  key={c.id}
                  onClick={() => setSelectedUser(c)}
                  className="w-full bg-white p-4 rounded-2xl flex items-center justify-between group hover:bg-[#00478d] hover:text-white transition-all shadow-sm border border-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white/20">
                      <UserIcon size={20} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">{c.nama}</p>
                      <p className="text-[10px] opacity-70">{c.noHp}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Header */}
            <section className="bg-[#00478d] text-white rounded-[2rem] p-6 shadow-xl shadow-[#00478d]/20 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase block mb-1">{t('admin.tasks.label.customer')}</span>
                  <h2 className="text-xl font-headline font-bold">ID: {activeCustomer.id.toUpperCase()}</h2>
                </div>
                {!assignedTask && (
                  <button onClick={() => setSelectedUser(null)} className="p-1.5 bg-white/10 rounded-full">
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase">{t('admin.user.label.name')}</p>
                  <p className="text-sm font-bold">{activeCustomer.nama}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60 font-bold uppercase">{t('admin.user.label.phone')}</p>
                  <p className="text-sm font-bold">{activeCustomer.noHp}</p>
                </div>
              </div>
            </section>

            {/* Inputs */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Gauge size={20} className="text-[#00478d]" />
                  <h3 className="text-md font-headline font-bold">{t('staff.tasks.reading')}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">{t('staff.reading.prev')}</label>
                    <div className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-500 font-mono text-lg flex items-center justify-between">
                      <span>{loadingAwal ? 'Loading...' : standAwal.toFixed(2)}</span>
                      <span className="text-xs uppercase ml-2 opacity-50 font-sans">m³</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">{t('staff.reading.curr')}</label>
                    <input
                      required
                      type="number"
                      value={readingValue}
                      onChange={(e) => setReadingValue(e.target.value)}
                      placeholder="000000.00"
                      className="w-full px-4 py-5 bg-slate-100 border-none rounded-2xl text-[#00478d] font-mono text-3xl focus:ring-2 focus:ring-[#00478d] transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
                <div className="flex items-center gap-3 mb-4">
                  <Camera size={20} className="text-[#00478d]" />
                  <h3 className="text-md font-headline font-bold">{t('staff.reading.proof')}</h3>
                </div>
                <div
                  onClick={() => setPhotoCaptured(true)}
                  className={`aspect-video w-full rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${photoCaptured ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {photoCaptured ? (
                    <div className="relative w-full h-full">
                      <img src="https://images.unsplash.com/photo-1590231804368-6c8a3074780d?w=400&h=300&fit=crop" className="w-full h-full object-cover rounded-[2rem]" />
                      <div className="absolute inset-0 bg-black/20 rounded-[2rem] flex items-center justify-center">
                        <CheckCircle2 className="text-white" size={48} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera size={32} className="text-slate-300 mb-2 mx-auto" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('staff.reading.capture')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !photoCaptured}
              className="w-full py-5 rounded-full bg-[#00478d] text-white font-bold text-lg shadow-xl shadow-[#00478d]/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Upload size={20} />
              {isSubmitting ? t('staff.reading.uploading') : t('staff.reading.submit')}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
