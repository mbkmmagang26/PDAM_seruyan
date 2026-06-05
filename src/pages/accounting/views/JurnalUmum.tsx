import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { Plus, Search, Filter, Loader2, Save, X, FileText, Download, Calendar, Trash2, Lock } from 'lucide-react';
import { sendNotification } from '../../../lib/notifications';
import { useAuth } from '../../../authContext';
import { logActivity } from '../../../lib/logger';

export default function JurnalUmum() {
  const { user: currentUser } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Semua Jurnal');
  const [showFilter, setShowFilter] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [filterDates, setFilterDates] = useState({ start: '', end: '' });

  // Debouncing effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
  });
  const [rows, setRows] = useState([
    { id: 1, account: '', debit: '', kredit: '', type: 'debit' },
    { id: 2, account: '', debit: '', kredit: '', type: 'kredit' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Listen to Transactions
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(100));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Listen to COA
    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      setCoa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTx(); unsubCoa(); };
  }, []);

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalKredit = rows.reduce((sum, row) => sum + (Number(row.kredit) || 0), 0);
  const isBalanced = totalDebit === totalKredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Jurnal tidak seimbang. Pastikan Total Debit = Total Kredit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const batchPromises = rows.map(row => {
        if (!row.account) return Promise.resolve();
        const debitAmt = Number(row.debit) || 0;
        const kreditAmt = Number(row.kredit) || 0;

        if (debitAmt > 0) {
          return addDoc(collection(db, 'transactions'), {
            date: formData.date,
            reference: formData.reference,
            description: formData.description,
            category: row.account,
            type: 'income', // mapped as debit based on current logic
            amount: debitAmt,
            status: 'pending',
            createdAt: serverTimestamp(),
            authorId: currentUser?.id || 'system',
            authorName: currentUser?.name || 'Unknown'
          });
        }
        if (kreditAmt > 0) {
          return addDoc(collection(db, 'transactions'), {
            date: formData.date,
            reference: formData.reference,
            description: formData.description,
            category: row.account,
            type: 'expense', // mapped as kredit based on current logic
            amount: kreditAmt,
            status: 'pending',
            createdAt: serverTimestamp(),
            authorId: currentUser?.id || 'system',
            authorName: currentUser?.name || 'Unknown'
          });
        }
        return Promise.resolve();
      });

      await Promise.all(batchPromises);

      logActivity(currentUser, 'Catat Jurnal Umum', `Mencatat transaksi jurnal: ${formData.reference} - ${formData.description}`);

      // Send Notification
      await sendNotification({
        title: 'Jurnal Umum Baru',
        message: `Transaksi [${formData.reference}] - ${formData.description} berhasil dicatat.`,
        type: 'success'
      });

      // Show Toast
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: {
          title: 'Jurnal Berhasil!',
          message: 'Data transaksi telah diposting ke sistem.',
          type: 'success'
        }
      }));

      setShowAddForm(false);
      setFormData({ date: new Date().toISOString().split('T')[0], reference: '', description: '' });
      setRows([
        { id: 1, account: '', debit: '', kredit: '', type: 'debit' },
        { id: 2, account: '', debit: '', kredit: '', type: 'kredit' }
      ]);
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambahkan jurnal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx?.isLocked) {
      alert('Transaksi ini telah dikunci (EOD) dan tidak dapat dihapus!');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      logActivity(currentUser, 'Hapus Jurnal', `Menghapus transaksi jurnal ID: ${id}`);
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  const addRow = (type: string = 'any') => {
    setRows([...rows, { id: Date.now(), account: '', debit: '', kredit: '', type }]);
    setShowAddDropdown(false);
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        // Jika debit diisi, kosongkan kredit. Jika kredit diisi, kosongkan debit.
        if (field === 'debit' && value !== '') updatedRow.kredit = '';
        if (field === 'kredit' && value !== '') updatedRow.debit = '';
        return updatedRow;
      }
      return row;
    }));
  };

  const removeRow = (id: number) => {
    if (rows.length > 2) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const filteredTx = transactions.filter(t => {
    const matchSearch = t.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      t.reference?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    let matchDate = true;
    if (filterDates.start) matchDate = matchDate && t.date >= filterDates.start;
    if (filterDates.end) matchDate = matchDate && t.date <= filterDates.end;

    if (!matchDate) return false;

    // Simplistic tab filtering logic
    if (activeTab === 'Semua Jurnal') return matchSearch;
    if (activeTab === 'Kas Masuk (JKM)') return matchSearch && t.type === 'income';
    if (activeTab === 'Bank Masuk (JBM)') return matchSearch && t.type === 'income' && t.category?.includes('Bank');
    if (activeTab === 'Kas Keluar (JKK)') return matchSearch && t.type === 'expense';
    if (activeTab === 'Bank Keluar (JBK)') return matchSearch && t.type === 'expense' && t.category?.includes('Bank');

    return matchSearch;
  });

  const handleExport = () => {
    const dataToExport = filteredTx.map(t => ({
      Tanggal: t.date,
      Referensi: t.reference,
      Keterangan: t.description,
      Akun: t.category,
      Debit: t.type === 'income' ? t.amount : 0,
      Kredit: t.type === 'expense' ? t.amount : 0,
      Status: t.status || 'pending'
    }));
    exportToCSV(dataToExport, `Jurnal_Umum_${new Date().toISOString().split('T')[0]}`);
    logActivity(currentUser, 'Export Jurnal', 'Mengekspor data jurnal ke CSV');
  };

  const tabs = ["Semua Jurnal", "Kas Masuk (JKM)", "Bank Masuk (JBM)", "Kas Keluar (JKK)", "Bank Keluar (JBK)"];

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Jurnal Umum...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Jurnal Umum</h2>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Periode Aktif: 2026</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari referensi atau keterangan"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFilter(true)}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm bg-white shadow-sm transition-all ${filterDates.start || filterDates.end ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} /> {filterDates.start || filterDates.end ? 'Filter Aktif' : 'Filter'}
          </button>
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-medium text-sm bg-white shadow-sm"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Jurnal Baru
          </button>
        </div>
      </div>

      {/* Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {filteredTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
              <FileText className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 font-medium mb-1">Belum ada transaksi jurnal terdaftar.</p>
            <p className="text-sm text-slate-400">Gunakan tombol "Jurnal Baru" untuk memulai pencatatan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">No. Ref</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4">Akun (COA)</th>
                  <th className="p-4 text-right">Debit</th>
                  <th className="p-4 text-right">Kredit</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {filteredTx.map(t => (
                   <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                     <td className="p-4 text-slate-600">{t.date}</td>
                     <td className="p-4 text-slate-600 font-mono text-xs">{t.reference || '-'}</td>
                     <td className="p-4 font-medium text-slate-800">{t.description}</td>
                     <td className="p-4 text-slate-600">
                       <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{t.category || '-'}</span>
                     </td>
                     <td className="p-4 text-right font-medium text-slate-700">{t.type === 'income' ? formatCurrency(t.amount) : '-'}</td>
                     <td className="p-4 text-right font-medium text-slate-700">{t.type === 'expense' ? formatCurrency(t.amount) : '-'}</td>
                     <td className="p-4 text-center">
                       <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
                           t.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                             'bg-amber-100 text-amber-700'
                         }`}>
                         {t.status || 'pending'}
                       </span>
                     </td>
                      <td className="p-4 text-right">
                        {t.isLocked ? (
                          <div className="text-slate-400 p-1.5 flex items-center justify-end" title="Terkunci (EOD Rekonsiliasi)">
                            <Lock size={16} />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Jurnal Baru */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Catat Jurnal Baru</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">No. Referensi</label>
                  <input type="text" placeholder="Contoh: BKM-001" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-1.5 mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan</label>
                <input type="text" required placeholder="Deskripsi transaksi..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div className="mb-4 flex justify-between items-end relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Input Akun & Nilai</label>
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowAddDropdown(!showAddDropdown)} 
                    className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={16} /> Tambah Baris
                  </button>
                  
                  {showAddDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <button 
                        type="button"
                        onClick={() => addRow('debit')}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Tambah Debit
                      </button>
                      <button 
                        type="button"
                        onClick={() => addRow('kredit')}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Tambah Kredit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {rows.map((row) => (
                  <div key={row.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <select
                      required
                      value={row.account}
                      onChange={e => updateRow(row.id, 'account', e.target.value)}
                      className="w-full sm:w-[40%] p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                      <option value="">Pilih Akun...</option>
                      {coa.map(c => (
                        <option 
                          key={c.id} 
                          value={c.code} 
                          disabled={c.level < 3}
                          className={c.level < 3 ? 'font-bold text-slate-900 bg-slate-50' : ''}
                        >
                          {c.level === 2 ? '　' : c.level === 3 ? '　　' : ''}
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-3 w-full sm:w-[60%] relative">
                      {row.type === 'debit' && (
                        <input
                          type="number"
                          min="0"
                          placeholder="Debit"
                          value={row.debit}
                          onChange={e => updateRow(row.id, 'debit', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-right"
                        />
                      )}

                      {row.type === 'kredit' && (
                        <input
                          type="number"
                          min="0"
                          placeholder="Kredit"
                          value={row.kredit}
                          onChange={e => updateRow(row.id, 'kredit', e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-right"
                        />
                      )}

                      {row.type === 'any' && (
                        <>
                          <input
                            type="number"
                            min="0"
                            placeholder="Debit"
                            value={row.debit}
                            onChange={e => updateRow(row.id, 'debit', e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-right"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Kredit"
                            value={row.kredit}
                            onChange={e => updateRow(row.id, 'kredit', e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all text-right"
                          />
                        </>
                      )}

                      {rows.length > 2 && (
                        <button type="button" onClick={() => removeRow(row.id)} className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-100 gap-4">
                <div className="w-full sm:w-auto">
                  <div className="flex gap-6 text-sm mb-1">
                    <span className="text-slate-500">Total Debit: <span className="font-bold text-slate-800">{formatCurrency(totalDebit)}</span></span>
                    <span className="text-slate-500">Total Kredit: <span className="font-bold text-slate-800">{formatCurrency(totalKredit)}</span></span>
                  </div>
                  {isBalanced ? (
                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">✓ Jurnal seimbang.</span>
                  ) : (
                    <span className="text-rose-500 text-xs font-bold flex items-center gap-1">⚠ Jurnal belum seimbang atau kosong.</span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                    Batal
                  </button>
                  <button
                    disabled={isSubmitting || !isBalanced}
                    type="submit"
                    className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Transaksi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Filter */}
      {showFilter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Filter Periode</h3>
              <button onClick={() => setShowFilter(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
                <input type="date" value={filterDates.start} onChange={e => setFilterDates({ ...filterDates, start: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Selesai</label>
                <input type="date" value={filterDates.end} onChange={e => setFilterDates({ ...filterDates, end: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setFilterDates({ start: '', end: '' }); setShowFilter(false); }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilter(false)}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

