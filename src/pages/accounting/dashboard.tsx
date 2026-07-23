import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import {
  LayoutDashboard, LayoutGrid, LayoutPanelLeft, Server, FileText,
  Book, Wallet, Users, HardDrive, Package, PieChart, BarChart3,
  CheckSquare, MessageCircle, Grid, LogOut, Menu, X, Search, Bell, Info, CheckCircle, AlertTriangle, AlertCircle,
  UploadCloud, FileSpreadsheet, ShieldCheck, Table, History as HistoryIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import ThemeToggle from '../../components/ThemeToggle';

// Subviews
import DashboardUtama from './views/DashboardUtama';
import JurnalUmum from './views/JurnalUmum';
import BukuBesar from './views/BukuBesar';
import HutangAP from './views/HutangAP';
import PiutangAR from './views/PiutangAR';
import AsetTetap from './views/AsetTetap';
import Persediaan from './views/Persediaan';
import Anggaran from './views/Anggaran';
import LaporanKeuangan from './views/LaporanKeuangan';
import VerifikasiData from './views/VerifikasiData';
import Pengaduan from './views/Pengaduan';
import Operasional from './views/Operasional';
import NeracaLajurView from './views/NeracaLajur';
import LogAktivitas from './views/LogAktivitas';
import ImportDataView from './views/ImportData';

export type ModuleView = 
  | 'dashboard_utama'
  | 'jurnal_umum' | 'buku_besar' | 'neraca_lajur' | 'hutang_ap' | 'piutang_ar' | 'aset_tetap'
  | 'persediaan' | 'anggaran' | 'laporan_keuangan' | 'verifikasi_data'
  | 'pengaduan' | 'operasional' | 'log_aktivitas' | 'import_data';

export default function AccountingDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleView>('dashboard_utama');
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    setIsNotifOpen(false);
  }, [activeModule]);

  useEffect(() => {
    if (user) setEditName(user.name);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || !user) return;
    try {
      const ref = doc(db, 'user_admin', user.id);
      await updateDoc(ref, { name: editName });
      setIsEditProfileOpen(false);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Sukses', message: 'Nama profil berhasil diperbarui. Halaman akan dimuat ulang...', type: 'success' } }));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { title: 'Gagal', message: 'Gagal memperbarui profil', type: 'error' } }));
    }
  };

  // Guard: Redirect jika bukan direktur atau accounting
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'direktur' && user.role !== 'accounting'))) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', 'in', [user.id, 'system', 'all']),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const { title, message, type = 'info' } = e.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  useEffect(() => {
    const handleChangeModule = (e: any) => {
      if (e.detail?.module) {
        setActiveModule(e.detail.module as ModuleView);
        if (window.innerWidth < 1024) setShowMenu(false);
      }
    };

    window.addEventListener('app-change-module', handleChangeModule);
    return () => window.removeEventListener('app-change-module', handleChangeModule);
  }, []);

  const markNotifRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (authLoading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  const isAccounting = user?.role === 'accounting';

  const menuItems: { id: ModuleView; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard_utama', label: 'Dashboard Utama', icon: LayoutDashboard },
    ...(isAccounting ? [
      { id: 'jurnal_umum', label: 'Jurnal Umum', icon: FileText },
      { id: 'buku_besar', label: 'Buku Besar (GL)', icon: Book },
      { id: 'neraca_lajur', label: 'Neraca Lajur (Worksheet)', icon: Table },
      { id: 'hutang_ap', label: 'Hutang (AP)', icon: Wallet },
      { id: 'piutang_ar', label: 'Piutang (AR)', icon: Users },
      { id: 'aset_tetap', label: 'Aset Tetap', icon: HardDrive },
      { id: 'persediaan', label: 'Persediaan', icon: Package },
      { id: 'anggaran', label: 'Anggaran', icon: PieChart },
      { id: 'laporan_keuangan', label: 'Laporan Keuangan', icon: BarChart3 },
      { id: 'verifikasi_data', label: 'Verifikasi Data', icon: CheckSquare },
      { id: 'pengaduan', label: 'Pengaduan', icon: MessageCircle },
      { id: 'operasional', label: 'Operasional', icon: Grid },
      { id: 'log_aktivitas', label: 'Log Aktivitas', icon: HistoryIcon },
      { id: 'import_data', label: 'Import', icon: UploadCloud },
    ] as { id: ModuleView; label: string; icon: React.ElementType }[] : [])
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard_utama': return <DashboardUtama />;
      case 'import_data': return <ImportDataView />;
      case 'jurnal_umum': return <JurnalUmum />;
      case 'buku_besar': return <BukuBesar />;
      case 'neraca_lajur': return <NeracaLajurView />;
      case 'hutang_ap': return <HutangAP />;
      case 'piutang_ar': return <PiutangAR />;
      case 'aset_tetap': return <AsetTetap />;
      case 'persediaan': return <Persediaan />;
      case 'anggaran': return <Anggaran />;
      case 'laporan_keuangan': return <LaporanKeuangan />;
      case 'verifikasi_data': return <VerifikasiData />;
      case 'pengaduan': return <Pengaduan />;
      case 'operasional': return <Operasional />;
      case 'log_aktivitas': return <LogAktivitas />;
      default: return <DashboardUtama />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Sidebar - Dark Theme as requested */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#0f172a] shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${showMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:relative`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-lg shadow-blue-600/20 p-1">
              <img src="/logo-pdam.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-white font-bold tracking-wide">SIA SERUYAN</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">{isAccounting ? 'PDAM Accounting' : 'PDAM Direktur'}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMenu(false)}
            className="ml-auto p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
          <div className="mb-4 px-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">MODUL UTAMA</p>
          </div>
          <nav className="space-y-1.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  if (window.innerWidth < 1024) setShowMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeModule === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={18} className={activeModule === item.id ? 'text-white' : 'text-slate-400'} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-[#0f172a]">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-bold">Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Mobile Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:hidden shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/logo-pdam.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <h1 className="font-bold text-slate-800 dark:text-white">SIA SERUYAN</h1>
          </div>
          <button 
            onClick={() => setShowMenu(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Desktop Top Header - The missing piece from user request */}
        <header className="hidden lg:flex h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {menuItems.find(m => m.id === activeModule)?.label || 'Dashboard'}
            </h1>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
              Periode Aktif: {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <ThemeToggle />
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2.5 rounded-xl transition-all relative group ${isNotifOpen ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Notifikasi</h3>
                      <span className="text-[10px] text-blue-600 font-bold">{unreadCount} Baru</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                          <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button 
                            key={n.id} 
                            onClick={() => { markNotifRead(n.id); setIsNotifOpen(false); }} 
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                          >
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-700 mx-2"></div>
            
            <div className="relative">
              <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">{user.role}</p>
                </div>
                <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Modal Edit Profil */}
        <AnimatePresence>
          {isEditProfileOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Profil</h3>
                  <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex flex-col items-center mb-6">
                    <img src={user.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-slate-900 shadow-md mb-3" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{user.role}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="text" 
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>

        {/* Toast Container */}
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-start gap-4 min-w-[320px] max-w-md relative overflow-hidden"
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  toast.type === 'success' ? "bg-emerald-50 text-emerald-600" :
                  toast.type === 'error' ? "bg-rose-50 text-rose-600" :
                  toast.type === 'warning' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {toast.type === 'success' && <CheckCircle size={20} />}
                  {toast.type === 'error' && <AlertCircle size={20} />}
                  {toast.type === 'warning' && <AlertTriangle size={20} />}
                  {toast.type === 'info' && <Info size={20} />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-900 leading-tight">{toast.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{toast.message}</p>
                </div>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={14} className="text-slate-400" />
                </button>
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className={`absolute bottom-0 left-0 h-1 ${
                    toast.type === 'success' ? "bg-emerald-500" :
                    toast.type === 'error' ? "bg-rose-500" :
                    toast.type === 'warning' ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
