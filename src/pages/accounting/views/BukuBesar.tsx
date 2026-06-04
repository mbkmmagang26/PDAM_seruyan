import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToCSV } from '../../../lib/utils';
import { Book, Loader2, Filter, Search, Plus, Download, X, Layers, Calendar, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../../../authContext';
import { logActivity } from '../../../lib/logger';

export default function BukuBesar() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoa, setSelectedCoa] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState('Daftar Akun (COA)');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterDates, setFilterDates] = useState({ start: '', end: '' });
  const [coaForm, setCoaForm] = useState({
    code: '',
    name: '',
    type: 'ASSET',
    level: 1
  });
  const [editingCoa, setEditingCoa] = useState<any>(null);
  const tabs = ["Daftar Akun (COA)", "Buku Besar Per Akun"];
  const [isSeeding, setIsSeeding] = useState(false);

  const pdamCOAs = [
    { code: '1.1', name: 'Kas dan Setara Kas', type: 'ASSET', level: 2 },
    { code: '1.1.1', name: 'Kas Kecil', type: 'ASSET', level: 3 },
    { code: '1.1.2', name: 'Kas Bank', type: 'ASSET', level: 3 },
    { code: '1.2', name: 'Piutang Usaha', type: 'ASSET', level: 2 },
    { code: '1.2.1', name: 'Piutang Air', type: 'ASSET', level: 3 },
    { code: '1.2.2', name: 'Piutang Non-Air', type: 'ASSET', level: 3 },
    { code: '1.3', name: 'Persediaan', type: 'ASSET', level: 2 },
    { code: '1.3.1', name: 'Persediaan Bahan Kimia', type: 'ASSET', level: 3 },
    { code: '1.3.2', name: 'Persediaan Pipa & Material', type: 'ASSET', level: 3 },
    { code: '1.4', name: 'Aset Tetap', type: 'ASSET', level: 2 },
    { code: '1.4.1', name: 'Tanah', type: 'ASSET', level: 3 },
    { code: '1.4.2', name: 'Instalasi Pengolahan Air', type: 'ASSET', level: 3 },
    { code: '1.4.3', name: 'Akumulasi Penyusutan Aset Tetap', type: 'ASSET', level: 3 },
    { code: '2.1', name: 'Utang Jangka Pendek', type: 'LIABILITY', level: 2 },
    { code: '2.1.1', name: 'Utang Usaha', type: 'LIABILITY', level: 3 },
    { code: '2.1.2', name: 'Utang Pajak', type: 'LIABILITY', level: 3 },
    { code: '2.2', name: 'Utang Jangka Panjang', type: 'LIABILITY', level: 2 },
    { code: '2.2.1', name: 'Utang Bank Jangka Panjang', type: 'LIABILITY', level: 3 },
    { code: '3.1', name: 'Ekuitas', type: 'EQUITY', level: 2 },
    { code: '3.1.1', name: 'Modal Pemda', type: 'EQUITY', level: 3 },
    { code: '3.1.2', name: 'Laba Ditahan', type: 'EQUITY', level: 3 },
    { code: '4.1', name: 'Pendapatan Operasional', type: 'REVENUE', level: 2 },
    { code: '4.1.1', name: 'Pendapatan Penjualan Air', type: 'REVENUE', level: 3 },
    { code: '4.1.2', name: 'Pendapatan Sambungan Baru', type: 'REVENUE', level: 3 },
    { code: '4.1.3', name: 'Pendapatan Denda Keterlambatan', type: 'REVENUE', level: 3 },
    { code: '4.2', name: 'Pendapatan Non-Operasional', type: 'REVENUE', level: 2 },
    { code: '4.2.1', name: 'Pendapatan Bunga Bank', type: 'REVENUE', level: 3 },
    { code: '5.1', name: 'Beban Operasional', type: 'EXPENSE', level: 2 },
    { code: '5.1.1', name: 'Beban Gaji & Tunjangan', type: 'EXPENSE', level: 3 },
    { code: '5.1.2', name: 'Beban Pemeliharaan Instalasi', type: 'EXPENSE', level: 3 },
    { code: '5.1.3', name: 'Beban Bahan Kimia', type: 'EXPENSE', level: 3 },
    { code: '5.1.4', name: 'Beban Listrik & Air', type: 'EXPENSE', level: 3 },
    { code: '5.1.5', name: 'Beban Penyusutan', type: 'EXPENSE', level: 3 },
    { code: '5.2', name: 'Beban Non-Operasional', type: 'EXPENSE', level: 2 },
    { code: '5.2.1', name: 'Beban Administrasi Bank', type: 'EXPENSE', level: 3 },
  ];

  const handleSeedCOA = async () => {
    if (!confirm('Apakah Anda yakin ingin menambahkan COA standar PDAM? Data yang sudah ada tidak akan dihapus, tetapi jika ada kode yang sama mungkin akan menjadi ganda.')) return;
    setIsSeeding(true);
    try {
      const batchPromises = pdamCOAs.map(c => 
        addDoc(collection(db, 'coa'), {
          ...c,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(batchPromises);
      logActivity(user, 'Generate COA Standar', 'Menyuntikkan daftar COA standar PDAM ke database');
      alert('Berhasil menambahkan COA standar PDAM!');
    } catch (err: any) {
      alert('Gagal menambahkan COA: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'asc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qCoa = query(collection(db, 'coa'), orderBy('code', 'asc'));
    const unsubCoa = onSnapshot(qCoa, (snapshot) => {
      const coaData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        // Determine level from code length (simplistic fallback if level not in db)
        const codeParts = (data.code || '').split('.');
        const level = data.level || (codeParts.length > 0 ? codeParts.length : 1);
        return { id: doc.id, ...data, level };
      });
      setCoa(coaData);
      if (coaData.length > 0 && !selectedCoa) {
        setSelectedCoa(coaData[0].code);
      }
    });

    return () => { unsubTx(); unsubCoa(); };
  }, [selectedCoa]);

  const handleAddCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoa) {
        const { id, ...updateData } = coaForm as any;
        await updateDoc(doc(db, 'coa', editingCoa.id), {
          ...updateData,
          level: Number(coaForm.level),
          updatedAt: serverTimestamp()
        });
        logActivity(user, 'Edit Akun COA', `Mengedit akun COA: ${coaForm.code} - ${coaForm.name}`);
      } else {
        await addDoc(collection(db, 'coa'), {
          ...coaForm,
          level: Number(coaForm.level),
          createdAt: serverTimestamp()
        });
        logActivity(user, 'Tambah Akun COA', `Menambahkan akun COA baru: ${coaForm.code} - ${coaForm.name}`);
      }
      setShowAddForm(false);
      setEditingCoa(null);
      setCoaForm({ code: '', name: '', type: 'ASSET', level: 1 });
    } catch (err: any) {
      alert('Gagal memproses akun COA: ' + err.message);
    }
  };

  const handleDeleteCoa = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;
    try {
      await deleteDoc(doc(db, 'coa', id));
      logActivity(user, 'Hapus Akun COA', `Menghapus akun COA ID: ${id}`);
    } catch (err: any) {
      alert('Gagal menghapus akun: ' + err.message);
    }
  };

  const ledgerData = useMemo(() => {
    if (!selectedCoa) return [];
    
    let currentBalance = 0;
    const isAssetOrExpense = (selectedCoa || '').startsWith('1') || (selectedCoa || '').startsWith('5');
    
    const accountTx = transactions.filter(t => {
      const matchCoa = t.category === selectedCoa;
      let matchDate = true;
      if (filterDates.start) matchDate = matchDate && t.date >= filterDates.start;
      if (filterDates.end) matchDate = matchDate && t.date <= filterDates.end;
      return matchCoa && matchDate;
    });
    
    return accountTx.map(t => {
      const debit = t.type === 'income' ? t.amount : 0;
      const kredit = t.type === 'expense' ? t.amount : 0;
      
      // Saldo Normal: Aset & Beban bertambah di Debit. Kewajiban, Ekuitas, Pendapatan bertambah di Kredit.
      if (isAssetOrExpense) {
        currentBalance += (debit - kredit);
      } else {
        currentBalance += (kredit - debit);
      }

      return {
        ...t,
        debit,
        kredit,
        balance: currentBalance
      };
    });
  }, [transactions, selectedCoa, filterDates]);

  const handleExportCoa = () => {
    const data = coa.map(c => ({
      Kode: c.code,
      Nama: c.name,
      Tipe: c.type,
      Level: c.level
    }));
    exportToCSV(data, 'Daftar_COA');
    logActivity(user, 'Export COA', 'Mengekspor daftar akun COA ke CSV');
  };

  const handleExportLedger = () => {
    if (!selectedCoa) return;
    const data = ledgerData.map(t => ({
      Tanggal: t.date,
      Keterangan: t.description,
      Debit: t.debit,
      Kredit: t.kredit,
      Saldo: t.balance
    }));
    exportToCSV(data, `Buku_Besar_${selectedCoa}`);
    logActivity(user, 'Export Buku Besar', `Mengekspor laporan buku besar untuk akun: ${selectedCoa}`);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Buku Besar...</div>;

  const currentAccount = coa.find(c => c.code === selectedCoa);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Buku Besar (General Ledger)</h2>
          <p className="text-slate-500">Buku besar merangkum transaksi berdasarkan akun.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Daftar Akun (COA)' ? (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilter(true)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium text-sm bg-white shadow-sm ${filterDates.start || filterDates.end ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter size={18} /> {filterDates.start || filterDates.end ? 'Filter Aktif' : 'Filter'}
              </button>
              <button 
                onClick={handleExportCoa}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-medium text-sm bg-white shadow-sm"
              >
                <Download size={18} /> Export
              </button>
              {coa.length < 5 && (
                <button 
                  onClick={handleSeedCOA}
                  disabled={isSeeding}
                  className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />} Generate COA Standar
                </button>
              )}
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={18} /> Tambah Akun COA
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Kode Akun</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Nama Akun</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Tipe</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Level</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Kategori</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coa.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.code || '').includes(searchTerm)).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{c.code}</td>
                      <td className="p-4 text-slate-700 font-medium" style={{ paddingLeft: c.level === 1 ? '1rem' : c.level === 2 ? '2.5rem' : '4rem' }}>
                        {c.name}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-xs text-slate-600 uppercase">{c.type || (c.code?.startsWith('1') ? 'ASSET' : c.code?.startsWith('2') ? 'LIABILITY' : c.code?.startsWith('3') ? 'EQUITY' : c.code?.startsWith('4') ? 'REVENUE' : 'EXPENSE')}</span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-600">{c.level}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold border ${c.level === 1 || c.level === 2 ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                            {c.level === 1 || c.level === 2 ? 'HEADER' : 'POSTING'}
                          </span>
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
                            SISTEM
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingCoa(c);
                              setCoaForm({
                                code: c.code,
                                name: c.name,
                                type: c.type || 'ASSET',
                                level: c.level
                              });
                              setShowAddForm(true);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-all"
                            title="Edit Akun"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCoa(c.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                            title="Hapus Akun"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {coa.length === 0 && (
                     <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data COA terdaftar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Book className="text-blue-600" />
              <span className="font-bold text-slate-700">Pilih Akun COA:</span>
            </div>
            <select 
              value={selectedCoa} 
              onChange={e => setSelectedCoa(e.target.value)}
              className="w-full sm:w-96 p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium"
            >
              {coa.filter(c => c.level > 2).map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowFilter(true)}
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-medium text-sm ml-auto bg-white shadow-sm ${filterDates.start || filterDates.end ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={18} /> {filterDates.start || filterDates.end ? 'Filter Periode' : 'Filter Periode'}
            </button>
            <button 
              onClick={handleExportLedger}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium text-sm bg-white shadow-sm"
            >
              <Download size={18} /> Export
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                Riwayat Transaksi: <span className="text-blue-600">{currentAccount?.name || '-'}</span>
              </h3>
              <span className="text-sm font-bold text-slate-500">Saldo Normal: {selectedCoa.startsWith('1') || selectedCoa.startsWith('5') ? 'Debit' : 'Kredit'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4 text-right">Debit (Rp)</th>
                    <th className="p-4 text-right">Kredit (Rp)</th>
                    <th className="p-4 text-right">Saldo (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada transaksi pada akun ini.</td></tr>
                  ) : ledgerData.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600">{t.date}</td>
                      <td className="p-4 font-medium text-slate-800">{t.description}</td>
                      <td className="p-4 text-right text-slate-600">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                      <td className="p-4 text-right text-slate-600">{t.kredit > 0 ? formatCurrency(t.kredit) : '-'}</td>
                      <td className="p-4 text-right font-black text-slate-800">{formatCurrency(t.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Modal Tambah COA */}
      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowAddForm(false); setEditingCoa(null); setCoaForm({ code: '', name: '', type: 'ASSET', level: 1 }); }} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${editingCoa ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} rounded-2xl flex items-center justify-center`}>
                  {editingCoa ? <Pencil size={20} /> : <Layers size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">{editingCoa ? 'Edit Akun' : 'Tambah Akun'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chart of Accounts</p>
                </div>
              </div>
              <button onClick={() => { setShowAddForm(false); setEditingCoa(null); setCoaForm({ code: '', name: '', type: 'ASSET', level: 1 }); }} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCoa} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kode Akun</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: 1.1.1" 
                  value={coaForm.code}
                  onChange={e => setCoaForm({...coaForm, code: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Akun</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Kas Besar" 
                  value={coaForm.name}
                  onChange={e => setCoaForm({...coaForm, name: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tipe</label>
                  <select 
                    value={coaForm.type}
                    onChange={e => setCoaForm({...coaForm, type: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Level</label>
                  <select 
                    value={coaForm.level}
                    onChange={e => setCoaForm({...coaForm, level: Number(e.target.value)})}
                    className="w-full p-4 rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 bg-slate-50/50"
                  >
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className={`w-full ${editingCoa ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'} text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] mt-4`}
              >
                {editingCoa ? 'Simpan Perubahan' : 'Simpan Akun'}
              </button>
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
                <input type="date" value={filterDates.start} onChange={e => setFilterDates({...filterDates, start: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Selesai</label>
                <input type="date" value={filterDates.end} onChange={e => setFilterDates({...filterDates, end: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
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

