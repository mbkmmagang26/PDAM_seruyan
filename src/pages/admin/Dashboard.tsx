import React, { useState, useEffect } from 'react';
import { 
  Waves, 
  Search, 
  Bell, 
  HelpCircle, 
  Plus, 
  Users, 
  BadgeCheck, 
  Clock, 
  TrendingUp, 
  History, 
  LayoutDashboard, 
  CreditCard, 
  Wrench, 
  Settings, 
  LogOut,
  Edit,
  Ban,
  Undo,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  X,
  UserPlus,
  Eye,
  EyeOff,
  Check,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../authContext';
import { useTasks } from '../../taskContext';
import { useLanguage } from '../../languageContext';
import { useRequests } from '../../requestContext';
import LanguageToggle from '../../components/LanguageToggle';
import WaterFlow from './WaterFlow';
import Billing from './Billing';
import { User, Task, UserRole } from '../../types';

type AdminView = 'dashboard' | 'waterflow' | 'billing' | 'tasks' | 'users' | 'requests';
type UserFilter = 'staff' | 'customer';

export default function AdminDashboard() {
  const { user, logout, allUsers, updateUserStatus, register } = useAuth();
  const { tasks, createTask, assignTask, isLoading: tasksLoading } = useTasks();
  const { requests, approveRequest, rejectRequest } = useRequests();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [userFilter, setUserFilter] = useState<UserFilter>('staff');
  
  // Modals state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<string[]>([]);

  // Form states
  const [newUserReg, setNewUserReg] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    role: 'staff' as UserRole
  });
  const [newTaskForm, setNewTaskForm] = useState({
    type: 'repair' as 'repair' | 'reading' | 'disconnection' | 'new_connection',

    location: '',
    district: '',
    priority: 'normal' as 'high' | 'normal',
    reason: '',
    assignedTo: ''
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification(t('admin.user.copy_code'));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(newUserReg.name, newUserReg.email, newUserReg.phone, newUserReg.address, newUserReg.password, newUserReg.role);
      showNotification(t('admin.user.success_create'), 'success');
      setIsAddingUser(false);
      setNewUserReg({ name: '', email: '', phone: '', address: '', password: '', role: 'staff' });
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const openAddUser = () => {
    setNewUserReg({ name: '', email: '', phone: '', address: '', password: '', role: userFilter });
    setIsAddingUser(true);
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      await updateUserStatus(userId, newStatus);
      showNotification(t('admin.user.msg.status_updated'), 'success');
    } catch (err: any) {
      showNotification(t('admin.user.msg.status_error'), 'error');
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    createTask({
      title: '', // Generated in UI
      type: newTaskForm.type,
      location: newTaskForm.location,
      district: newTaskForm.district,
      priority: newTaskForm.priority,
      reason: newTaskForm.reason,
      assignedTo: newTaskForm.assignedTo || undefined,
      deadline: 'CYCLE'
    });
    
    showNotification(t('admin.tasks.success'), 'success');
    setIsAddingTask(false);
    setNewTaskForm({
      type: 'repair',
      location: '',
      district: '',
      priority: 'normal',
      reason: '',
      assignedTo: ''
    });
  };

  const stats = [
    { label: t('admin.stats.total_staff'), value: allUsers.filter((u: User) => u.role === 'staff').length.toString(), change: '+4.2%', color: 'text-primary', icon: Users, trend: 'up' as const },
    { label: t('admin.stats.active_staff'), value: allUsers.filter((u: User) => u.role === 'staff' && u.status === 'active').length.toString(), sub: t('admin.stats.active_online'), color: 'text-tertiary', icon: BadgeCheck },
    { label: t('admin.stats.task_orders'), value: tasks.filter((task: Task) => task.status !== 'completed').length.toString(), sub: t('admin.stats.pending_tasks'), color: 'text-secondary', icon: Clock },
  ];

  const renderContent = () => {
    if (activeView === 'waterflow') return <WaterFlow />;
    if (activeView === 'billing') return <Billing />;

    if (activeView === 'requests') {
      return (
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-8 flex justify-between items-center bg-white border-b border-slate-100">
            <div>
              <h2 className="text-2xl font-headline font-bold text-slate-800">{t('admin.requests.title')}</h2>
              <p className="text-sm text-slate-500 font-medium">{t('admin.requests.subtitle')}</p>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">{t('admin.requests.table.details')}</th>
                <th className="px-8 py-5">{t('admin.requests.table.contact')}</th>
                <th className="px-8 py-5">{t('admin.requests.table.date')}</th>
                <th className="px-8 py-5">{t('admin.requests.table.status')}</th>
                <th className="px-8 py-5 text-right">{t('admin.requests.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">
                    {t('admin.requests.empty')}
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                          {req.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{req.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{req.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-700">{req.phone}</p>
                      <p className="text-xs text-slate-500 font-medium">{req.address}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-600">
                        {new Date(req.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                          req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                           {t(`admin.requests.status.${req.status}`)}
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => {
                              approveRequest(req.id);
                              showNotification(t('admin.requests.status.approved'), 'success');
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs"
                          >
                            {t('admin.requests.approve')}
                          </button>
                          <button 
                            onClick={() => {
                              rejectRequest(req.id);
                              showNotification(t('admin.requests.status.rejected'), 'error');
                            }}
                            className="px-3 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all font-bold text-xs"
                          >
                            {t('admin.requests.reject')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      );
    }
    
    
    if (activeView === 'users') {
      return (
        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-8 flex justify-between items-center bg-white">
            <div>
              <h2 className="text-2xl font-headline font-bold text-slate-800">
                {userFilter === 'staff' ? t('admin.user.management') : 'Manajemen Pelanggan'}
              </h2>
              <p className="text-sm text-slate-500 font-medium">{t('admin.user.management_sub')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
                <button
                  onClick={() => setUserFilter('staff')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    userFilter === 'staff'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('admin.user.role.staff')}
                </button>
                <button
                  onClick={() => setUserFilter('customer')}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    userFilter === 'customer'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('admin.user.role.customer')}
                </button>
              </div>
              <button 
                onClick={() => openAddUser()}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                <UserPlus size={20} />
                {t('admin.user.add_new')}
              </button>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">{t('admin.user.table.identity')}</th>
                <th className="px-8 py-5">{t('admin.user.table.contact')}</th>
                <th className="px-8 py-5">{t('admin.user.table.password')}</th>
                <th className="px-8 py-5">{t('admin.user.table.role_status')}</th>
                <th className="px-8 py-5 text-right">{t('admin.user.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allUsers.filter((u: User) => u.role === userFilter).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">
                    Tidak ada {userFilter === 'staff' ? 'staff' : 'pelanggan'} yang ditemukan
                  </td>
                </tr>
              ) : (
                allUsers.filter((u: User) => u.role === userFilter).map((u: User) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-700">{u.email}</p>
                      <p className="text-xs text-slate-500 font-medium">{u.phone}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 group/pass">
                        <p className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          {visiblePasswords.includes(u.id) ? (u.password || '••••••••') : '••••••••'}
                        </p>
                        <button 
                          onClick={() => setVisiblePasswords(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-all opacity-0 group-hover/pass:opacity-100"
                          title={visiblePasswords.includes(u.id) ? 'Hide Password' : 'Show Password'}
                        >
                          {visiblePasswords.includes(u.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 
                          u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.role === 'admin' ? t('login.role.admin.title').split(' ')[0] : 
                           u.role === 'staff' ? t('admin.user.role.staff') : t('admin.user.role.customer')}
                        </span>
                        <div className={`flex items-center gap-1.5 font-bold text-[10px] ${u.status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 pulse'}`}></div>
                          {u.status.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-all active:scale-95 transition-all"><Edit size={18} /></button>
                        {u.status === 'active' ? (
                          <button 
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-error transition-all active:scale-95 group/btn"
                            title={t('admin.user.button.deactivate')}
                          >
                            <Ban size={18} className="group-hover/btn:rotate-12 transition-transform" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="p-2.5 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all active:scale-95 group/btn"
                            title={t('admin.user.button.activate')}
                          >
                            <Check size={18} className="group-hover/btn:scale-125 transition-transform" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      );
    }

    if (activeView === 'tasks') {
      return (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-headline font-bold text-slate-800">{t('admin.tasks.management')}</h2>
              <p className="text-sm text-slate-500 font-medium">{t('admin.tasks.management_sub')}</p>
            </div>
            <button 
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              <Plus size={20} />
              {t('admin.tasks.add')}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('admin.tasks.status.pending')}</p>
                <h4 className="text-2xl font-headline font-bold text-slate-800">{tasks.filter(t => t.status === 'pending').length}</h4>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-blue-500">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{t('admin.tasks.status.assigned')}</p>
                <h4 className="text-2xl font-headline font-bold text-slate-800">{tasks.filter(t => t.status === 'assigned').length}</h4>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t('admin.tasks.status.completed')}</p>
                <h4 className="text-2xl font-headline font-bold text-slate-800">{tasks.filter(t => t.status === 'completed').length}</h4>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm border-l-4 border-l-red-500">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{t('admin.tasks.priority.high').toUpperCase()}</p>
                <h4 className="text-2xl font-headline font-bold text-red-600">{tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length}</h4>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                   <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4">{t('admin.tasks.table.details')}</th>
                      <th className="px-8 py-4">{t('admin.tasks.table.reason')}</th>
                      <th className="px-8 py-4">{t('admin.tasks.table.assignee')}</th>
                      <th className="px-8 py-4">{t('admin.tasks.table.status')}</th>
                      <th className="px-8 py-4 text-right">{t('admin.tasks.table.actions')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">
                          {t('admin.tasks.empty')}
                        </td>
                      </tr>
                   ) : (
                     tasks.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                 <div className={`p-2.5 rounded-xl ${
                                    task.type === 'repair' ? 'bg-red-50 text-red-500' : 
                                    task.type === 'reading' ? 'bg-blue-50 text-blue-500' : 
                                    task.type === 'new_connection' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                                 }`}>
                                    {task.type === 'repair' ? <Wrench size={18} /> : 
                                     task.type === 'reading' ? <TrendingUp size={18} /> : 
                                     task.type === 'new_connection' ? <Plus size={18} /> : <Scissors size={18} />}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-800 text-sm">
                                      {task.type === 'reading' && t('admin.tasks.type.reading')}
                                      {task.type === 'new_connection' && t('admin.tasks.type.new_connection')}
                                      {task.type === 'disconnection' && `${t('admin.tasks.type.disconnection_prefix')} ${task.customerName}`}
                                      {task.type === 'repair' && `${t('admin.tasks.type.repair_prefix')} ${task.reason}`}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{task.location}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              <div className="flex flex-col gap-1">
                                 <span className={`text-[10px] font-bold w-fit px-2 py-0.5 rounded ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                 }`}>
                                    {t(`admin.tasks.priority.${task.priority}`).toUpperCase()}
                                 </span>
                                 <p className="text-xs text-slate-500 font-medium italic">{task.reason || t('admin.tasks.routine')}</p>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              {task.assignedTo ? (
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                       {allUsers.find(u => u.id === task.assignedTo)?.name.substring(0, 1)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{allUsers.find(u => u.id === task.assignedTo)?.name || t('admin.tasks.unknown_staff')}</span>
                                 </div>
                              ) : (
                                 <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                    <Clock size={14} /> {t('admin.tasks.unassigned_tag')}
                                 </span>
                              )}
                           </td>
                           <td className="px-8 py-5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                 task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                 task.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                 {t(`admin.tasks.status.${task.status}`).toUpperCase()}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right">
                              {task.status !== 'completed' && (
                                 <div className="relative inline-block text-left">
                                    <button 
                                      onClick={() => setSelectedTaskForAssignment(selectedTaskForAssignment === task.id ? null : task.id)}
                                      className="p-2 hover:bg-slate-100 rounded-xl transition-all text-primary font-bold text-xs flex items-center gap-2 group"
                                    >
                                       {task.assignedTo ? t('admin.tasks.change_staff') : t('admin.tasks.assign_staff')}
                                       <Edit size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>

                                    <AnimatePresence>
                                      {selectedTaskForAssignment === task.id && (
                                        <motion.div 
                                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                                        >
                                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('admin.tasks.available_staff')}</div>
                                          <div className="max-h-48 overflow-y-auto">
                                            {allUsers.filter(u => u.role === 'staff' && u.status === 'active').map(staff => (
                                              <button 
                                                key={staff.id}
                                                onClick={() => {
                                                  assignTask(task.id, staff.id);
                                                  setSelectedTaskForAssignment(null);
                                                  showNotification(`${t('admin.user.msg.assigned')} ${staff.name}`, 'success');
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-primary/5 flex items-center gap-3 transition-colors"
                                              >
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                  {staff.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                  <p className="text-xs font-bold text-slate-700">{staff.name}</p>
                                                  <p className="text-[10px] text-slate-400">{staff.phone}</p>
                                                </div>
                                                {task.assignedTo === staff.id && <Check size={14} className="text-primary" />}
                                              </button>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                 </div>
                              )}
                           </td>
                        </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
        </section>
      );
    }

    return (
      <div className="space-y-8">
        {/* Stats Grid */}
        <section className="grid grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl hover:shadow-primary/5 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className={`text-3xl font-headline font-extrabold mt-1 ${stat.color}`}>{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${stat.color === 'text-primary' ? 'bg-primary/5 text-primary' : stat.color === 'text-tertiary' ? 'bg-tertiary/5 text-tertiary' : 'bg-secondary/5 text-secondary'} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={28} />
                </div>
              </div>
              {stat.change ? (
                <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="font-bold text-emerald-600">{stat.change}</span> {t('admin.stats.vs_last_month')}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-4 font-medium italic opacity-80">{stat.sub}</p>
              )}
            </motion.div>
          ))}
        </section>

        {/* Dashboard Actions Bar */}
        <section className="flex gap-4">
           <button 
             onClick={() => setActiveView('users')}
             className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:bg-primary/5 transition-colors group"
           >
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                 <Users size={24} />
               </div>
               <div className="text-left">
                 <h4 className="font-bold text-slate-800">{t('admin.user.management')}</h4>
                 <p className="text-xs text-slate-500 font-medium">{t('admin.user.management_sub')}</p>
               </div>
             </div>
             <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <Plus size={20} />
             </div>
           </button>

           <button 
             onClick={() => setActiveView('tasks')}
             className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:bg-secondary/5 transition-colors group"
           >
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-secondary/5 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-all">
                 <Wrench size={24} />
               </div>
               <div className="text-left">
                 <h4 className="font-bold text-slate-800">{t('admin.tasks.management')}</h4>
                 <p className="text-xs text-slate-500 font-medium">{t('admin.tasks.management_sub')}</p>
               </div>
             </div>
             <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-secondary/10 group-hover:text-secondary transition-all">
                <Plus size={20} />
             </div>
           </button>
        </section>

        {/* Activity Log */}
        <section className="bg-slate-900 rounded-[3.5rem] p-10 text-white border-l-[10px] border-primary relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <History size={24} />
            </div>
            <h2 className="font-bold text-xl font-headline tracking-tight">{t('common.history')}</h2>
          </div>
          <div className="space-y-8 relative z-10">
            <div className="flex gap-6 items-start group">
              <div className="w-2.5 h-2.5 mt-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0 group-hover:scale-125 transition-transform"></div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-100">{t('admin.activity.tariff_update')}</p>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">14 MINS AGO</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{t('admin.activity.tariff_desc')}</p>
              </div>
            </div>
            <div className="flex gap-6 items-start group">
              <div className="w-2.5 h-2.5 mt-2 rounded-full bg-slate-700 shrink-0 group-hover:scale-125 transition-transform"></div>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-100">{t('admin.activity.new_staff')}</p>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2 HOURS AGO</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{t('admin.activity.staff_desc')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col py-10 px-6 fixed h-full z-50">
        <div className="mb-12 px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Waves size={24} />
            </div>
            <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">{t('app.name')}</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold">{t('common.search')} MANAGEMENT</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
              activeView === 'dashboard' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <LayoutDashboard size={20} />
              <span className="text-sm">{t('admin.sidebar.dashboard')}</span>
            </div>
            {activeView === 'dashboard' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
          </button>
          
          <button 
            onClick={() => setActiveView('users')}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
              activeView === 'users' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Users size={20} />
              <span className="text-sm">{t('admin.user.management')}</span>
            </div>
            {activeView === 'users' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
          </button>

          <button 
            onClick={() => setActiveView('requests')}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
              activeView === 'requests' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <FileText size={20} />
              <span className="text-sm">{t('admin.sidebar.requests')}</span>
            </div>
            {activeView === 'requests' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
          </button>

          <button 
            onClick={() => setActiveView('tasks')}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
              activeView === 'tasks' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Wrench size={20} />
              <span className="text-sm">{t('admin.sidebar.tasks')}</span>
            </div>
            {activeView === 'tasks' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>}
          </button>

          <div className="pt-4 pb-2 px-5">
             <div className="h-px bg-slate-100 w-full"></div>
          </div>

          <button 
            onClick={() => setActiveView('waterflow')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${
              activeView === 'waterflow' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Waves size={20} />
            <span className="text-sm">{t('admin.sidebar.waterflow')}</span>
          </button>
          <button 
            onClick={() => setActiveView('billing')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${
              activeView === 'billing' ? 'bg-primary text-white font-bold shadow-xl shadow-primary/20' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={20} />
            <span className="text-sm">{t('admin.sidebar.billing')}</span>
          </button>
        </nav>
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-center p-2">
             <LanguageToggle />
          </div>

          <button onClick={logout} className="w-full flex items-center gap-4 px-5 py-3.5 text-error font-bold hover:bg-red-50 rounded-2xl transition-all">
            <LogOut size={20} />
            <span className="text-sm">{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen relative">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4">
             <div className="relative group">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                 type="text" 
                 placeholder={t('common.search')} 
                 className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm w-80 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
               />
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              <button className="p-3 bg-white text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl relative transition-all border border-slate-50">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-3 bg-white text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all border border-slate-50">
                <HelpCircle size={20} />
              </button>
            </div>
            
            <div className="h-10 w-px bg-slate-100 mx-2"></div>
            
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-[10px] text-primary font-extrabold uppercase tracking-tighter">{t('admin.profile.role')}</p>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={logout}
                    className="p-2.5 text-slate-400 hover:text-error hover:bg-red-50 rounded-xl transition-all border border-slate-100 hover:border-red-100"
                    title={t('common.logout')}
                  >
                    <LogOut size={18} />
                  </button>
                  <div className="w-12 h-12 rounded-2xl overflow-hidden ring-4 ring-primary/5 shadow-inner">
                    <img 
                      src={user?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop"} 
                      alt="Admin" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
               </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-10">
          <AnimatePresence mode="wait">
             <motion.div
               key={activeView}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               {renderContent()}
             </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border ${
                notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <p className="font-bold text-sm tracking-tight">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded-lg p-1 transition-all"><X size={18} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add User Modal */}
        <AnimatePresence>
          {isAddingUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingUser(false)}
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
                    <h3 className="text-2xl font-headline font-bold text-slate-800">{t('admin.user.add_title')}</h3>
                    <p className="text-sm text-slate-500 font-medium">{t('admin.user.management_sub')}</p>
                  </div>
                  <button onClick={() => setIsAddingUser(false)} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={24} /></button>
                </div>
                <form onSubmit={handleCreateUser} className="p-10 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.user.label.name')}</label>
                    <input type="text" required value={newUserReg.name} onChange={e => setNewUserReg({...newUserReg, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. John Doe" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.user.label.email')}</label>
                      <input type="email" required value={newUserReg.email} onChange={e => setNewUserReg({...newUserReg, email: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="john@example.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.user.label.phone')}</label>
                      <input type="tel" required value={newUserReg.phone} onChange={e => setNewUserReg({...newUserReg, phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="08..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Alamat Domisili</label>
                    <textarea required value={newUserReg.address} onChange={e => setNewUserReg({...newUserReg, address: e.target.value})} rows={2} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Alamat lengkap..."></textarea>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.user.label.password')}</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={newUserReg.password} onChange={e => setNewUserReg({...newUserReg, password: e.target.value})} className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-wider text-xs">{t('admin.user.button.cancel')}</button>
                    <button type="submit" className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-wider text-xs bg-gradient-to-r from-primary to-[#005cbb]">{t('admin.user.button.create')}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Work Order Modal */}
        <AnimatePresence>
           {isAddingTask && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAddingTask(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                />
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
                >
                  <div className="p-10 pb-6 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                    <div>
                       <h3 className="text-2xl font-headline font-bold text-slate-800">{t('admin.tasks.add_title')}</h3>
                       <p className="text-sm text-slate-500 font-medium">{t('admin.tasks.management_sub')}</p>
                    </div>
                    <button onClick={() => setIsAddingTask(false)} className="p-3 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={24} /></button>
                  </div>

                  <form onSubmit={handleCreateTask} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.tasks.label.type')}</label>
                        <div className="grid grid-cols-4 gap-2">
                           {(['repair', 'reading', 'disconnection', 'new_connection'] as const).map(type => (
                             <button
                               key={type}
                               type="button"
                               onClick={() => setNewTaskForm({...newTaskForm, type})}
                               className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-1.5 border ${
                                 newTaskForm.type === type ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                               }`}
                             >
                               {type === 'repair' ? <Wrench size={14} /> : type === 'reading' ? <TrendingUp size={14} /> : type === 'new_connection' ? <Plus size={14} /> : <Scissors size={14} />}
                               {t(`admin.tasks.type.${type}`).split(' ')[0]}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.tasks.label.staff')}</label>
                          <select 
                            value={newTaskForm.assignedTo}
                            onChange={e => setNewTaskForm({...newTaskForm, assignedTo: e.target.value})}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                          >
                             <option value="">{t('admin.tasks.unassigned')}</option>
                             {allUsers.filter(u => u.role === 'staff' && u.status === 'active').map(u => (
                               <option key={u.id} value={u.id}>{u.name}</option>
                             ))}
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.tasks.label.district')}</label>
                          <input 
                            type="text"
                            required
                            value={newTaskForm.district}
                            onChange={e => setNewTaskForm({...newTaskForm, district: e.target.value})}
                            placeholder={t('admin.tasks.placeholder.district')}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.tasks.label.location')}</label>
                          <input 
                            type="text"
                            required
                            value={newTaskForm.location}
                            onChange={e => setNewTaskForm({...newTaskForm, location: e.target.value})}
                            placeholder={t('admin.tasks.placeholder.location')}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 ml-1">{t('admin.tasks.label.reason')}</label>
                       <textarea 
                         required
                         rows={3}
                         value={newTaskForm.reason}
                         onChange={e => setNewTaskForm({...newTaskForm, reason: e.target.value})}
                         placeholder={newTaskForm.type === 'disconnection' ? t('admin.tasks.placeholder.reason_disconnect') : t('admin.tasks.placeholder.reason_leak')}
                         className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
                       />
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button 
                         type="button" 
                         onClick={() => setIsAddingTask(false)}
                         className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-wider text-xs"
                       >
                         {t('admin.user.button.cancel')}
                       </button>
                       <button 
                         type="submit"
                         className="flex-[2] py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-wider text-xs bg-gradient-to-r from-primary to-[#005cbb]"
                       >
                         {t('admin.tasks.button.create')}
                       </button>
                    </div>
                  </form>
                </motion.div>
             </div>
           )}
        </AnimatePresence>
      </main>
    </div>
  );
}
