import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { History, Search, Loader2, Clock, User, FileText, CheckCircle, AlertTriangle, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export default function LogAktivitas() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('Semua');

  useEffect(() => {
    const q = query(
      collection(db, 'tb_activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Log Aktivitas...</div>;

  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterRole !== 'Semua') {
      return matchSearch && (log.userRole || '').toLowerCase() === filterRole.toLowerCase();
    }
    
    return matchSearch;
  });

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('buat') || lowerAction.includes('tambah') || lowerAction.includes('create')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (lowerAction.includes('hapus') || lowerAction.includes('delete')) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (lowerAction.includes('edit') || lowerAction.includes('update')) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  const getRoleColor = (role: string) => {
    const lowerRole = (role || '').toLowerCase();
    if (lowerRole === 'admin') return 'text-purple-600 bg-purple-50 border-purple-100';
    if (lowerRole === 'staff') return 'text-blue-600 bg-blue-50 border-blue-100';
    if (lowerRole === 'accounting') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (lowerRole === 'direktur') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Log Aktivitas Sistem</h2>
          <p className="text-slate-500 text-sm">Pemantauan riwayat aktivitas seluruh pengguna (Admin, Staff, Akuntansi).</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari aktivitas, nama pengguna, atau detail..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar">
          {['Semua', 'Admin', 'Staff', 'Accounting', 'Direktur'].map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${
                filterRole === role 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Belum ada log aktivitas.</div>
          ) : (
            filteredLogs.map((log) => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <History size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <time className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-3">{log.details}</p>
                  <div className="flex items-center gap-2 mt-auto border-t border-slate-50 pt-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={12} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-none">{log.userName || 'Unknown User'}</p>
                      <p className={`text-[9px] font-black uppercase tracking-widest mt-1 inline-block px-1.5 py-0.5 rounded border ${getRoleColor(log.userRole)}`}>
                        {log.userRole || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
