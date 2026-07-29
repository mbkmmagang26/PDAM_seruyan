import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency, exportToPDF } from '../../../lib/utils';
import { HardDrive, Loader2, Plus, X, Search, Filter, Download, Activity, PieChart, LayoutDashboard, Briefcase, Calculator, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../authContext';

export default function AsetTetap() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Daftar Aset');
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Semua');
  const tabs = ["Daftar Aset", "Penyusutan", "Mutasi Aset"];

  const [mutations, setMutations] = useState<any[]>([]);
  const [showMutasiForm, setShowMutasiForm] = useState(false);
  const [mutasiForm, setMutasiForm] = useState({
    assetId: '',
    type: 'Penjualan',
    date: new Date().toISOString().split('T')[0],
    value: 0,
    notes: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'Peralatan & Mesin',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 0,
    depreciationMethod: 'Garis Lurus',
    usefulLife: 5,
    residualValue: 0,
    condition: 'baik'
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    const unsubAssets = onSnapshot(query(collection(db, 'inventaris_aset_tetap')), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubMutations = onSnapshot(query(collection(db, 'tb_mutasi_aset')), (snapshot) => {
      setMutations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { clearTimeout(timer); unsubAssets(); unsubMutations(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventaris_aset_tetap'), {
        ...formData,
        acquisitionCost: Number(formData.acquisitionCost),
        usefulLife: Number(formData.usefulLife),
        residualValue: Number(formData.residualValue),
        bookValue: Number(formData.acquisitionCost),
        createdAt: serverTimestamp(),
        authorId: user?.id || 'system',
        authorName: user?.name || 'Unknown'
      });
      setShowAddForm(false);
      setFormData({ 
        name: '', 
        category: 'Peralatan & Mesin', 
        acquisitionDate: new Date().toISOString().split('T')[0], 
        acquisitionCost: 0, 
        depreciationMethod: 'Garis Lurus',
        usefulLife: 5,
        residualValue: 0,
        condition: 'baik' 
      });
    } catch (err: any) {
      alert('Gagal menambah aset: ' + err.message);
    }
  };

  const handleMutasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiForm.assetId) {
      alert('Pilih aset terlebih dahulu');
      return;
    }
    
    try {
      const asset = assets.find(a => a.id === mutasiForm.assetId);
      
      await addDoc(collection(db, 'tb_mutasi_aset'), {
        ...mutasiForm,
        assetName: asset?.name || 'Unknown Aset',
        value: Number(mutasiForm.value),
        createdAt: serverTimestamp(),
        authorId: user?.id || 'system',
        authorName: user?.name || 'Unknown'
      });

      // Update asset status based on mutation type
      if (mutasiForm.type === 'Penghapusan' || mutasiForm.type === 'Penjualan' || mutasiForm.type === 'Rusak Berat') {
        const assetRef = doc(db, 'inventaris_aset_tetap', mutasiForm.assetId);
        await updateDoc(assetRef, { condition: mutasiForm.type === 'Rusak Berat' ? 'rusak_berat' : 'dihapus' });
      }

      setShowMutasiForm(false);
      setMutasiForm({
        assetId: '',
        type: 'Penjualan',
        date: new Date().toISOString().split('T')[0],
        value: 0,
        notes: ''
      });
      alert('Mutasi aset berhasil dicatat!');
    } catch (err: any) {
      alert('Gagal mencatat mutasi: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aset ini?')) return;
    try {
      await deleteDoc(doc(db, 'inventaris_aset_tetap', id));
    } catch (err: any) {
      alert('Gagal menghapus aset: ' + err.message);
    }
  };

  const filtered = assets.filter(a => {
    const matchSearch = (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (a.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterCategory !== 'Semua') return matchSearch && a.category === filterCategory;
    
    return matchSearch;
  });

  const handleExport = () => {
    const data = filtered.map(a => ({
      Nama_Aset: a.name,
      Kategori: a.category,
      Tgl_Perolehan: a.acquisitionDate,
      Harga_Perolehan: a.acquisitionCost,
      Nilai_Buku: a.bookValue || a.acquisitionCost,
      Kondisi: a.condition
    }));
    exportToPDF(data, 'Daftar_Aset_Tetap');
  };

  const handleImportXLS = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

        for (const row of jsonData) {
          const name = row['Nama_Aset'] || row['Nama Aset'] || row['name'];
          if (!name) continue;

          await addDoc(collection(db, 'inventaris_aset_tetap'), {
            name: name,
            category: row['Kategori'] || row['category'] || 'Peralatan & Mesin',
            acquisitionDate: row['Tgl_Perolehan'] || row['Tgl Perolehan'] || new Date().toISOString().split('T')[0],
            acquisitionCost: Number(row['Harga_Perolehan'] || row['Harga Perolehan'] || 0),
            bookValue: Number(row['Nilai_Buku'] || row['Nilai Buku'] || row['Harga_Perolehan'] || 0),
            usefulLife: Number(row['Masa_Manfaat'] || row['Masa Manfaat'] || 5),
            residualValue: Number(row['Nilai_Residu'] || row['Nilai Residu'] || 0),
            depreciationMethod: row['Metode'] || 'Garis Lurus',
            condition: row['Kondisi'] || 'baik',
            createdAt: serverTimestamp(),
            authorId: user?.id || 'system',
            authorName: user?.name || 'Unknown'
          });
        }
        alert('Data aset berhasil diimport!');
        e.target.value = '';
      } catch (err: any) {
        console.error(err);
        alert('Gagal mengimport data: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" />Memuat Data Aset...</div>;

  const totalAssetValue = assets.reduce((sum, a) => sum + (Number(a.bookValue) || Number(a.acquisitionCost) || 0), 0);
  const categoriesCount = new Set(assets.map(a => a.category)).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Aset Tetap (Fixed Assets)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Pengelolaan inventaris, nilai buku, dan penyusutan aset.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={18} /> Tambah Aset Tetap
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">BUKU BESAR</span>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Nilai Buku</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-800 dark:text-white truncate" title={formatCurrency(totalAssetValue)}>{formatCurrency(totalAssetValue)}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">KLASIFIKASI</span>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Aset</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-800 dark:text-white">{categoriesCount} <span className="text-xs lg:text-sm text-slate-400 font-bold uppercase">Grup</span></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 dark:border-slate-700 p-5 lg:p-6 rounded-3xl shadow-sm flex flex-col gap-4 text-white overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="text-[9px] lg:text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg">KESEHATAN ASET</span>
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kondisi Aset Baik</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">100%</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-colors relative ${
              activeTab === tab ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Daftar Aset' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama aset atau kategori..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-white dark:bg-slate-800 shadow-sm font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilter(true)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${filterCategory !== 'Semua' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50'}`}
              >
                <Filter size={18} /> {filterCategory !== 'Semua' ? `Kat: ${filterCategory}` : 'Filter'}
              </button>
              <label className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 flex items-center justify-center gap-2 font-bold text-sm bg-white dark:bg-slate-800 cursor-pointer transition-all">
                <Upload size={18} /> Import XLS
                <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleImportXLS} />
              </label>
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 flex items-center justify-center gap-2 font-bold text-sm bg-white dark:bg-slate-800 transition-all"
              >
                <Download size={18} /> Export
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Informasi Aset</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Kategori</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Tgl Perolehan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Harga Perolehan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Nilai Buku</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-center">Kondisi</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">Belum ada data aset yang terdaftar.</td></tr>
                  ) : filtered.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50/80 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            <Briefcase size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white">{a.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">REF: {a.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase">
                          {a.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-bold text-xs">{a.acquisitionDate}</td>
                      <td className="p-4 text-right text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(a.acquisitionCost || 0)}</td>
                      <td className="p-4 text-right">
                        <p className="font-black text-blue-600">{formatCurrency(a.bookValue || a.acquisitionCost || 0)}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          a.condition === 'baik' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          a.condition === 'rusak_ringan' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {a.condition?.replace('_', ' ') || 'baik'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDelete(a.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 text-rose-600 p-1.5 rounded-lg hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Penyusutan' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-xs">Nama Aset</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Harga Perolehan</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Metode</th>
                    <th className="p-4 uppercase tracking-wider text-xs">Umur Ekonomis</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Penyusutan / Tahun</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Akumulasi Penyusutan</th>
                    <th className="p-4 uppercase tracking-wider text-xs text-right">Nilai Buku</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {assets.filter(a => a.depreciationMethod !== 'Tanpa Penyusutan' && a.condition !== 'dihapus').map(a => {
                    const currentYear = new Date().getFullYear();
                    const acqYear = new Date(a.acquisitionDate).getFullYear();
                    const yearsUsed = Math.min(Math.max(0, currentYear - acqYear), a.usefulLife || 0);
                    let depPerYear = 0;
                    if (a.depreciationMethod === 'Garis Lurus' && a.usefulLife > 0) {
                      depPerYear = (Number(a.acquisitionCost) - Number(a.residualValue || 0)) / a.usefulLife;
                    } else if (a.depreciationMethod === 'Saldo Menurun' && a.usefulLife > 0) {
                      const rate = 2 / a.usefulLife;
                      depPerYear = Number(a.acquisitionCost) * rate; 
                    }
                    const accumulated = Math.min(depPerYear * yearsUsed, Number(a.acquisitionCost) - Number(a.residualValue || 0));
                    const bookValue = Number(a.acquisitionCost) - accumulated;

                    return (
                      <tr key={`dep-${a.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800 dark:text-white">{a.name}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{formatCurrency(a.acquisitionCost || 0)}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase">{a.depreciationMethod}</span></td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{a.usefulLife} Tahun</td>
                        <td className="p-4 text-right text-rose-500 font-medium">{formatCurrency(depPerYear)}</td>
                        <td className="p-4 text-right text-rose-600 font-bold">{formatCurrency(accumulated)}</td>
                        <td className="p-4 text-right text-blue-600 font-black">{formatCurrency(bookValue)}</td>
                      </tr>
                    );
                  })}
                  {assets.filter(a => a.depreciationMethod !== 'Tanpa Penyusutan' && a.condition !== 'dihapus').length === 0 && (
                     <tr><td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">Tidak ada data aset yang disusutkan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Mutasi Aset' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Riwayat Mutasi Aset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Catatan perpindahan, penjualan, atau penghapusan aset tetap.</p>
              </div>
              <button onClick={() => setShowMutasiForm(true)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Plus size={16} /> Catat Mutasi
              </button>
            </div>
            
            {mutations.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                  <Activity size={32} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada riwayat mutasi aset yang tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="p-4 uppercase tracking-wider text-xs">Tanggal</th>
                      <th className="p-4 uppercase tracking-wider text-xs">Aset</th>
                      <th className="p-4 uppercase tracking-wider text-xs">Jenis Mutasi</th>
                      <th className="p-4 uppercase tracking-wider text-xs text-right">Nilai (Rp)</th>
                      <th className="p-4 uppercase tracking-wider text-xs">Keterangan</th>
                      <th className="p-4 uppercase tracking-wider text-xs text-right">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {mutations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{m.date}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white">{m.assetName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            m.type === 'Penjualan' ? 'bg-emerald-100 text-emerald-700' :
                            m.type === 'Penghapusan' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(m.value)}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={m.notes}>{m.notes || '-'}</td>
                        <td className="p-4 text-right text-xs text-slate-400">{m.authorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mutasi Modal Form */}
      {showMutasiForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Catat Mutasi Aset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Rekam aktivitas penjualan, perpindahan, atau penghapusan.</p>
              </div>
              <button onClick={() => setShowMutasiForm(false)} className="text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-rose-500 p-2 rounded-full transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleMutasiSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Aset</label>
                <select 
                  required
                  value={mutasiForm.assetId} 
                  onChange={e => setMutasiForm({...mutasiForm, assetId: e.target.value})} 
                  className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                >
                  <option value="">-- Pilih Aset Tetap --</option>
                  {assets.filter(a => a.condition !== 'dihapus').map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Buku: {formatCurrency(a.bookValue || a.acquisitionCost || 0)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Mutasi</label>
                  <select 
                    value={mutasiForm.type} 
                    onChange={e => setMutasiForm({...mutasiForm, type: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                  >
                    <option value="Penjualan">Penjualan</option>
                    <option value="Penghapusan">Penghapusan (Afkir)</option>
                    <option value="Perpindahan Lokasi">Perpindahan Lokasi</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal</label>
                  <input 
                    type="date" 
                    required 
                    value={mutasiForm.date} 
                    onChange={e => setMutasiForm({...mutasiForm, date: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Mutasi / Harga Jual (Opsional)</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0"
                  value={mutasiForm.value} 
                  onChange={e => setMutasiForm({...mutasiForm, value: Number(e.target.value)})} 
                  className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
                <textarea 
                  required
                  placeholder="Misal: Dijual karena peremajaan aset..."
                  value={mutasiForm.notes} 
                  onChange={e => setMutasiForm({...mutasiForm, notes: e.target.value})} 
                  className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowMutasiForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset Modal (Revamped per Screenshot) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tambah Aset Tetap</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Registrasi aset inventaris atau operasional baru.</p>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-rose-500 p-2 rounded-full transition-all shadow-sm border border-slate-100">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Aset</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Cth: Pompa Air Sentrifugal 50HP"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                  >
                    <option value="Peralatan & Mesin">Peralatan & Mesin</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Tanah & Bangunan">Tanah & Bangunan</option>
                    <option value="Inventaris Kantor">Inventaris Kantor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tgl Perolehan</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.acquisitionDate} 
                    onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Perolehan (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    value={formData.acquisitionCost} 
                    onChange={e => setFormData({...formData, acquisitionCost: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Penyusutan</label>
                  <select 
                    value={formData.depreciationMethod} 
                    onChange={e => setFormData({...formData, depreciationMethod: e.target.value})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                  >
                    <option value="Garis Lurus">Garis Lurus</option>
                    <option value="Saldo Menurun">Saldo Menurun</option>
                    <option value="Tanpa Penyusutan">Tanpa Penyusutan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Umur Ekonomis (Tahun)</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={formData.usefulLife} 
                    onChange={e => setFormData({...formData, usefulLife: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Sisa / Residu (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    value={formData.residualValue} 
                    onChange={e => setFormData({...formData, residualValue: Number(e.target.value)})} 
                    className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" 
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] text-slate-400 font-medium italic">Buku besar akan di-update secara asinkron saat posting bulanan.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50 transition-all text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Filter */}
      {showFilter && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Filter Kategori Aset</h3>
              <button onClick={() => setShowFilter(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {['Semua', 'Peralatan & Mesin', 'Kendaraan', 'Tanah & Bangunan', 'Inventaris Kantor'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setFilterCategory(cat); setShowFilter(false); }}
                    className={`w-full p-4 rounded-2xl text-left font-bold transition-all border ${
                      filterCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




