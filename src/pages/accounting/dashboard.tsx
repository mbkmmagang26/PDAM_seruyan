import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import {
  LayoutDashboard, LayoutGrid, LayoutPanelLeft, Server, FileText,
  Book, Wallet, Users, HardDrive, Package, PieChart, BarChart3,
  CheckSquare, MessageCircle, Grid, LogOut, Menu, X
} from 'lucide-react';

// Subviews
import DashboardUtama from './views/DashboardUtama';
import DashboardEksekutif from './views/DashboardEksekutif';
import DashboardManajerial from './views/DashboardManajerial';
import DashboardSIA from './views/DashboardSIA';
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

export type ModuleView = 
  | 'dashboard_utama' | 'dashboard_eksekutif' | 'dashboard_manajerial' | 'dashboard_sia'
  | 'jurnal_umum' | 'buku_besar' | 'hutang_ap' | 'piutang_ar' | 'aset_tetap'
  | 'persediaan' | 'anggaran' | 'laporan_keuangan' | 'verifikasi_data'
  | 'pengaduan' | 'operasional';

export default function AccountingDashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleView>('dashboard_utama');
  const [showMenu, setShowMenu] = useState(false);

  // Guard: Redirect jika bukan direktur
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'direktur')) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

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

  const menuItems: { id: ModuleView; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard_utama', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'dashboard_eksekutif', label: 'Dashboard Eksekutif', icon: LayoutGrid },
    { id: 'dashboard_manajerial', label: 'Dashboard Manajerial', icon: LayoutPanelLeft },
    { id: 'dashboard_sia', label: 'Dashboard SIA', icon: Server },
    { id: 'jurnal_umum', label: 'Jurnal Umum', icon: FileText },
    { id: 'buku_besar', label: 'Buku Besar (GL)', icon: Book },
    { id: 'hutang_ap', label: 'Hutang (AP)', icon: Wallet },
    { id: 'piutang_ar', label: 'Piutang (AR)', icon: Users },
    { id: 'aset_tetap', label: 'Aset Tetap', icon: HardDrive },
    { id: 'persediaan', label: 'Persediaan', icon: Package },
    { id: 'anggaran', label: 'Anggaran', icon: PieChart },
    { id: 'laporan_keuangan', label: 'Laporan Keuangan', icon: BarChart3 },
    { id: 'verifikasi_data', label: 'Verifikasi Data', icon: CheckSquare },
    { id: 'pengaduan', label: 'Pengaduan', icon: MessageCircle },
    { id: 'operasional', label: 'Operasional', icon: Grid },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard_utama': return <DashboardUtama />;
      case 'dashboard_eksekutif': return <DashboardEksekutif />;
      case 'dashboard_manajerial': return <DashboardManajerial />;
      case 'dashboard_sia': return <DashboardSIA />;
      case 'jurnal_umum': return <JurnalUmum />;
      case 'buku_besar': return <BukuBesar />;
      case 'hutang_ap': return <HutangAP />;
      case 'piutang_ar': return <PiutangAR />;
      case 'aset_tetap': return <AsetTetap />;
      case 'persediaan': return <Persediaan />;
      case 'anggaran': return <Anggaran />;
      case 'laporan_keuangan': return <LaporanKeuangan />;
      case 'verifikasi_data': return <VerifikasiData />;
      case 'pengaduan': return <Pengaduan />;
      case 'operasional': return <Operasional />;
      default: return <DashboardUtama />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
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
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-600/20">
              S
            </div>
            <div>
              <h1 className="text-white font-bold tracking-wide">SIA SERUYAN</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">PDAM Accounting</p>
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
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <div className="mb-4 px-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">MODUL UTAMA</p>
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
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className={activeModule === item.id ? 'text-white' : 'text-slate-400'} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-slate-800/50 bg-[#0f172a]">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
              S
            </div>
            <h1 className="font-bold text-slate-800">SIA SERUYAN</h1>
          </div>
          <button 
            onClick={() => setShowMenu(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}