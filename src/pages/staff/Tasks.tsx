import React, { useState } from 'react';
import { 
  Waves, 
  Bell, 
  Droplets, 
  Wrench, 
  MapPin, 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  ArrowRight, 
  ClipboardList, 
  LogOut,
  Search,
  X,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { useTasks } from '../../taskContext';
import { useLanguage } from '../../languageContext';
import LanguageToggle from '../../components/LanguageToggle';
import ThemeToggle from '../../components/ThemeToggle';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logActivity } from '../../lib/logger';

type Tab = 'repair' | 'reading' | 'disconnection' | 'new_connection';

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const { tasks, updateTaskStatus } = useTasks();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('repair');

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');

  React.useEffect(() => {
    if (user?.name) {
      setEditProfileName(user.name);
    }
  }, [user?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { name: editProfileName });
      setIsProfileModalOpen(false);
      alert('Profil berhasil diperbarui');
    } catch (error) {
      alert('Gagal memperbarui profil');
    }
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Filter tugas khusus untuk staff yang sedang login
  const myTasks = tasks.filter(t => t.assignedTo === user?.id);
  
  const unreadTasks = myTasks.filter(t => t.status === 'assigned' || t.status === 'pending');

  const searchResults = () => {
    if (!globalSearchQuery) return [];
    const lowerQuery = globalSearchQuery.toLowerCase();
    const res: any[] = [];
    myTasks.forEach(t => {
      if (t.customerName?.toLowerCase().includes(lowerQuery) || t.id?.toLowerCase().includes(lowerQuery) || t.reason?.toLowerCase().includes(lowerQuery)) {
        res.push({
          id: t.id,
          title: t.customerName || t.id,
          sub: t.type,
          onClick: () => {
            setActiveTab(t.type as Tab);
            setIsGlobalSearchOpen(false);
            setGlobalSearchQuery('');
            window.scrollTo({ top: 300, behavior: 'smooth' });
          }
        });
      }
    });
    return res;
  };
  
  const activeTasks = myTasks.filter(t => {
      if (activeTab === 'repair') return t.type === 'repair';
      if (activeTab === 'reading') return t.type === 'reading';
      if (activeTab === 'new_connection') return t.type === 'new_connection';
      return t.type === 'disconnection';
  }).sort((a, b) => {
    // Urutan: in-progress -> assigned/pending -> completed
    const statusOrder: Record<string, number> = {
      'in-progress': 0,
      'assigned': 1,
      'pending': 1,
      'completed': 2
    };
    
    const orderA = statusOrder[a.status] ?? 1;
    const orderB = statusOrder[b.status] ?? 1;
    
    return orderA - orderB;
  });

  const stats = {
    readings: myTasks.filter(t => t.type === 'reading' && t.status !== 'completed').length,
    repairs: myTasks.filter(t => t.type === 'repair' && t.status !== 'completed').length,
    disconnections: myTasks.filter(t => t.type === 'disconnection' && t.status !== 'completed').length,
    newConnections: myTasks.filter(t => t.type === 'new_connection' && t.status !== 'completed').length
  };

  // FUNGSI 1: Memulai Pekerjaan
  const handleStartTask = async (task: any) => {
    try {
      await updateTaskStatus(task.id, 'in-progress');
      logActivity(user, 'Mulai Pekerjaan', `Memulai pekerjaan tugas ${task.type} - ID: ${task.id}`);
      // alert('Pekerjaan dimulai! Silakan kerjakan tugas sesuai SOP.');
    } catch (error) {
      console.error(error);
      alert('Gagal memulai pekerjaan');
    }
  };

  // FUNGSI 2: Menyelesaikan Pekerjaan
  const handleCompleteTask = async (task: any) => {
    const confirmComplete = window.confirm('Apakah Anda yakin sudah menyelesaikan pekerjaan ini sepenuhnya?');
    if (confirmComplete) {
      try {
        let updates: any = {
          status: 'completed',
          completedAt: new Date().toISOString()
        };

        // Jika pemasangan baru, minta nomor meter
        if (task.type === 'new_connection') {
          const noMeter = window.prompt("Masukkan Nomor Meter yang terpasang:");
          if (noMeter === null) return; // Batal
          
          if (!noMeter.trim()) {
            alert("Nomor Meter wajib diisi untuk menyelesaikan pemasangan baru!");
            return;
          }
          updates.meterNumber = noMeter.trim();
        }

        // Update status perintah kerja jadi selesai
        const taskRef = doc(db, 'aksi_pengaduan', task.id);
        await updateDoc(taskRef, updates);
        
        // Update status pengaduan jadi selesai (jika tugas ini berasal dari pengaduan)
        if (task.pengaduanId) {
          const pengaduanRef = doc(db, 'pengaduan_pelanggan', task.pengaduanId);
          await updateDoc(pengaduanRef, {
            status: 'Selesai'
          });
        }

        // Update status permohonan jadi selesai (jika tugas ini berasal dari permohonan baru)
        if (task.permohonanId) {
          const permohonanRef = doc(db, 'tb_permohonan', task.permohonanId);
          await updateDoc(permohonanRef, {
            status: 'Selesai',
            no_meter: updates.meterNumber || ''
          });

          // Update tb_pelanggan (sinkronisasi data pelanggan baru)
          if (task.permohonanId) {
            await updateDoc(doc(db, 'tb_pelanggan', task.permohonanId), {
              no_meter: updates.meterNumber || '',
              id_pelanggan: `PLG-${updates.meterNumber || task.permohonanId.substring(0,5)}`,
            });
          }
        }
        
        logActivity(user, 'Selesai Pekerjaan', `Menyelesaikan tugas ${task.type} - ID: ${task.id}`);
        alert('Kerja bagus! Tugas berhasil diselesaikan.');
      } catch (error) {
        console.error(error);
        alert('Gagal menyelesaikan tugas');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface dark:bg-slate-900 pb-12">
      <header className="flex flex-col px-6 py-3 gap-3 sticky top-0 z-40 bg-white dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center gap-1">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              title="Edit Profil"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-200 cursor-pointer hover:ring-2 hover:ring-[#00478d]/20 transition-all shadow-sm shrink-0"
            >
              <img src={user?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop"} alt="Staff" className="w-full h-full object-cover" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <img src="/logo-pdam.png" alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm shrink-0" />
              <span className="text-sm sm:text-lg font-headline font-bold dark:text-white text-[#00478d] tracking-tight leading-tight hidden sm:block whitespace-nowrap">{t('app.name')}</span>
              <span className="text-[10px] font-headline font-bold dark:text-white text-[#00478d] tracking-tighter leading-tight sm:hidden uppercase">PDAM<br/>Seruyan</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <ThemeToggle />
            
            <div className="relative z-50">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2 rounded-full relative transition-all ${isNotifOpen ? 'bg-[#00478d] text-white' : 'text-[#00478d] hover:bg-[#00478d]/5'}`}>
                <Bell size={20} />
                {unreadTasks.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
              </button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 max-h-96 overflow-y-auto"
                  >
                    <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-widest">Tugas Baru</h3>
                      <span className="text-[10px] font-bold text-[#00478d] bg-[#00478d]/10 px-2 py-0.5 rounded-full">{unreadTasks.length} Baru</span>
                    </div>
                    {unreadTasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">Tidak ada tugas baru</div>
                    ) : (
                      unreadTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setActiveTab(t.type as Tab); setIsNotifOpen(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:bg-slate-900 border-b border-slate-50 dark:border-slate-700/50 transition-colors"
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Perintah Kerja</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t.customerName || t.id} - {t.type}</p>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={logout} className="p-1.5 sm:p-2 text-error hover:bg-error/5 rounded-full"><LogOut size={18} className="sm:w-5 sm:h-5" /></button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={e => {
              setGlobalSearchQuery(e.target.value);
              setIsGlobalSearchOpen(true);
            }}
            onFocus={() => setIsGlobalSearchOpen(true)}
            placeholder="Cari tugas..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
          <AnimatePresence>
            {isGlobalSearchOpen && globalSearchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 max-h-64 overflow-y-auto"
              >
                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-widest">Hasil Pencarian</h3>
                  <button onClick={() => setIsGlobalSearchOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300"><X size={14}/></button>
                </div>
                {searchResults().length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Tidak ada hasil ditemukan</div>
                ) : (
                  searchResults().map(res => (
                    <button
                      key={res.id}
                      onClick={res.onClick}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:bg-slate-900 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{res.title}</p>
                        <span className="text-[9px] font-bold text-[#00478d] bg-[#00478d]/10 px-2 py-0.5 rounded-full">TUGAS</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{res.sub}</p>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="px-6 py-6 space-y-8">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#00478d] to-[#005eb8] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#00478d]/20 relative overflow-hidden"
        >
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white dark:bg-slate-800/10 rounded-full blur-2xl" />
          <div className="absolute top-6 right-6 z-10 scale-90 origin-top-right">
            <LanguageToggle />
          </div>
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-2">{t('staff.stats.daily_target')}</p>
          <h2 className="text-3xl font-headline font-bold dark:text-white mb-1">{myTasks.filter(t => t.status !== 'completed').length} {t('admin.stats.task_orders')}</h2>
          <p className="text-sm opacity-90">{user?.name} • {t('staff.profile.sector')}</p>
          
          <div className="mt-8 flex items-end gap-2">
            <span className="text-5xl font-headline font-extrabold">{myTasks.length > 0 ? Math.round((myTasks.filter(t => t.status === 'completed').length / myTasks.length) * 100) : 0}%</span>
            <span className="text-xs mb-2 opacity-80 font-bold">{t('staff.stats.completed')} {t('staff.stats.today')}</span>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <div onClick={() => setActiveTab('reading')} className={`p-4 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === 'reading' ? 'bg-[#00478d]/10 dark:bg-blue-900/30 ring-1 ring-[#00478d]/20 dark:ring-blue-500/50' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <Droplets size={20} className="text-[#00478d] mb-2" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t('staff.tabs.reading')}</span>
            <span className="text-xl font-headline font-bold dark:text-white text-on-surface dark:text-white">{stats.readings}</span>
          </div>
          <div onClick={() => setActiveTab('new_connection')} className={`p-4 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === 'new_connection' ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-500/50' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <ClipboardList size={20} className="text-emerald-500 mb-2" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t('staff.tabs.new_connection')}</span>
            <span className="text-xl font-headline font-bold dark:text-white text-emerald-600">{stats.newConnections}</span>
          </div>
          <div onClick={() => setActiveTab('repair')} className={`p-4 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === 'repair' ? 'bg-red-50 dark:bg-red-900/30 ring-1 ring-red-200 dark:ring-red-500/50' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <Wrench size={20} className="text-red-500 mb-2" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t('staff.tabs.repair')}</span>
            <span className="text-xl font-headline font-bold dark:text-white text-red-600">{stats.repairs}</span>
          </div>
          <div onClick={() => setActiveTab('disconnection')} className={`p-4 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === 'disconnection' ? 'bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-200 dark:ring-amber-500/50' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <Scissors size={20} className="text-amber-500 mb-2" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t('staff.tabs.disconnection')}</span>
            <span className="text-xl font-headline font-bold dark:text-white text-amber-600 dark:text-amber-400">{stats.disconnections}</span>
          </div>
        </section>

        <nav className="flex overflow-x-auto no-scrollbar p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full gap-1 snap-x">
          {(['repair', 'reading', 'disconnection', 'new_connection'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 snap-center px-4 py-2.5 sm:py-3 rounded-full font-bold text-[10px] uppercase tracking-tighter transition-all ${
                activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-[#00478d] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab === 'disconnection' ? t('staff.tabs.disconnection') : 
               tab === 'new_connection' ? t('staff.tabs.new_connection') : t(`staff.tabs.${tab}`)}
            </button>
          ))}
        </nav>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-headline font-bold dark:text-white">
              Antrean {activeTab === 'repair' ? 'Perbaikan' : activeTab === 'reading' ? 'Pencatatan' : activeTab === 'new_connection' ? 'Sambungan Baru' : 'Pemutusan'}
            </h3>
            <span className="text-xs font-bold text-slate-400">{activeTasks.filter(t => t.status !== 'completed').length} {t('staff.tasks.work_orders')}</span>
          </div>

          <AnimatePresence mode="wait">
            <div className="space-y-4">
              {activeTab === 'reading' && (
                <button 
                  onClick={() => navigate('/staff/meter-reading')}
                  className="w-full bg-[#00478d] text-white py-5 rounded-[2rem] font-bold text-sm shadow-lg shadow-#00478d/20 flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
                >
                  <Gauge size={20} />
                  {t('staff.tasks.manual_reading')}
                </button>
              )}

              {activeTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-sm">
                   Belum ada tugas di kategori ini
                </div>
              ) : (
                activeTasks.map((task, i) => (
                  <motion.article 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border space-y-4 ${task.status === 'completed' ? 'border-emerald-100 opacity-70' : task.status === 'in-progress' ? 'border-[#00478d] ring-2 ring-#00478d/20' : 'border-slate-50 dark:border-slate-700/50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                        task.status === 'in-progress' ? 'bg-[#00478d]/10 text-[#00478d]' :
                        task.priority === 'high' ? 'bg-error/10 text-error' : 'bg-slate-100 text-slate-500 dark:text-slate-400'
                      }`}>
                        {task.status === 'completed' ? 'SELESAI' : 
                         task.status === 'in-progress' ? 'DIPROSES STAFF' : 
                         task.priority === 'high' ? 'PRIORITAS TINGGI' : 'NORMAL'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Nomor ID: {task.id}</span>
                    </div>

                    <div>
                      <h4 className="text-lg font-headline font-bold dark:text-white">
                        {task.type === 'reading' && t('admin.tasks.type.reading')}
                        {task.type === 'new_connection' && `Sambungan Baru: ${task.customerName}`}
                        {task.type === 'disconnection' && `${t('admin.tasks.type.disconnection_prefix')} ${task.customerName}`}
                        {task.type === 'repair' && `Perbaikan: ${task.reason?.split('-')[0] || 'Laporan Masuk'}`}
                      </h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                          <MapPin size={12} /> {task.district || 'Wilayah Seruyan'}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-bold leading-tight bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-2">
                           <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#00478d] flex-shrink-0" />
                           {task.location || 'Alamat tidak spesifik'}
                        </p>
                      </div>
                      {task.reason && (
                         <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 w-fit px-2 py-1.5 rounded-xl border border-amber-100/50">
                            <AlertTriangle size={12} /> {task.reason}
                         </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6 py-4 border-y border-slate-50 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#00478d]" />
                        <span className="text-xs font-bold">Siklus Terjadwal</span>
                      </div>
                      {task.deadline && (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#00478d]" />
                          <span className="text-[10px] font-bold uppercase leading-tight">
                            SELESAIKAN SEBELUM DEADLINE<br/>
                            {task.deadline === 'URGENT' ? '24 JAM' : task.deadline === 'CYCLE' ? 'AKHIR BULAN' : task.deadline}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AREA TOMBOL AKSI */}
                    {task.status !== 'completed' && (
                      <div className="flex gap-3">
                        {task.status === 'in-progress' ? (
                           <button 
                             onClick={() => handleCompleteTask(task)}
                             className="flex-1 bg-emerald-500 text-white py-4 rounded-full font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                             <CheckCircle2 size={20} />
                             Selesaikan Pekerjaan
                           </button>
                        ) : (
                           <button 
                             onClick={() => {
                                updateTaskStatus(task.id, 'in-progress');
                                if (task.type === 'reading') navigate(`/staff/meter-reading?taskId=${task.id}`);
                                else if (task.type === 'disconnection') navigate(`/staff/disconnection/${task.id}`);
                                else handleStartTask(task);
                             }}
                             className={`flex-1 text-white py-4 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all ${
                                task.type === 'disconnection' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-[#00478d] shadow-#00478d/20'
                             }`}
                           >
                             Mulai Pekerjaan {task.type === 'disconnection' ? 'Pemutusan' : task.type === 'repair' ? 'Perbaikan' : task.type === 'new_connection' ? 'Pemasangan' : 'Pencatatan'}
                           </button>
                        )}
                        
                        {/* Tombol Tiga Titik hanya muncul jika belum dikerjakan */}
                        {task.status !== 'in-progress' && (
                          <button className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all">
                            <MoreHorizontal size={24} />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.article>
                ))
              )}
            </div>
          </AnimatePresence>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:bg-[#00478d]/5 transition-colors border border-slate-50 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#00478d]/5 rounded-2xl flex items-center justify-center text-[#00478d] group-hover:bg-[#00478d] group-hover:text-white transition-all">
                <ClipboardList size={24} />
             </div>
             <div>
               <h5 className="font-headline font-bold dark:text-white text-sm">{t('staff.tasks.sop.title')}</h5>
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{t('staff.tasks.sop.subtitle')}</p>
             </div>
          </div>
          <ArrowRight size={20} className="text-[#00478d] group-hover:translate-x-1 transition-transform" />
        </section>
      </main>

      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-700"
            >
              <div className="p-8 pb-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-headline font-bold text-slate-800 dark:text-white">Edit Profil</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ubah nama tampilan Anda</p>
                </div>
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Masukkan nama..."
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-white bg-[#00478d] hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
