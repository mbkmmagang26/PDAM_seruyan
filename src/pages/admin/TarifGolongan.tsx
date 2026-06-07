import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Golongan } from '../../types';
import { Plus, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../../languageContext';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function TarifGolongan() {
  const { t } = useLanguage();
  const [golongan, setGolongan] = useState<Golongan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    biayaAdmin: 0,
    tarif1_10: 0,
    tarif11_20: 0,
    tarif21_up: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tb_golongan'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Golongan));
      setGolongan(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', biayaAdmin: 0, tarif1_10: 0, tarif11_20: 0, tarif21_up: 0 });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (g: Golongan) => {
    setFormData({
      name: g.name,
      biayaAdmin: g.biayaAdmin,
      tarif1_10: g.tarif1_10,
      tarif11_20: g.tarif11_20,
      tarif21_up: g.tarif21_up
    });
    setEditingId(g.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus golongan ini?')) {
      await deleteDoc(doc(db, 'tb_golongan', id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await setDoc(doc(db, 'tb_golongan', editingId), formData, { merge: true });
      } else {
        await addDoc(collection(db, 'tb_golongan'), formData);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving golongan:', err);
      alert('Gagal menyimpan data.');
    }
  };

  const seedDefaultData = async () => {
    if (!confirm('Ini akan menambahkan 16 golongan tarif default ke database. Lanjutkan?')) return;
    
    const defaults = [
      { name: 'Sosial Umum - Hidran Umum/Kran', tarif1_10: 2500, tarif11_20: 2850, tarif21_up: 3550, biayaAdmin: 10000 },
      { name: 'Sosial Umum - Kamar Mandi/WC Umum', tarif1_10: 2500, tarif11_20: 2850, tarif21_up: 3550, biayaAdmin: 10000 },
      { name: 'Sosial Umum - Tempat Ibadah', tarif1_10: 2500, tarif11_20: 2850, tarif21_up: 3550, biayaAdmin: 10000 },
      { name: 'Sosial Khusus - Yayasan Sosial (YS)', tarif1_10: 2900, tarif11_20: 3600, tarif21_up: 4800, biayaAdmin: 10000 },
      { name: 'Sosial Khusus - Panti Asuhan (PA)', tarif1_10: 2900, tarif11_20: 3600, tarif21_up: 4800, biayaAdmin: 10000 },
      { name: 'Sosial Khusus - Sekolah (S)', tarif1_10: 3300, tarif11_20: 4150, tarif21_up: 5550, biayaAdmin: 10000 },
      { name: 'Sosial Khusus - R.S Pemerintah (RS1)', tarif1_10: 3800, tarif11_20: 4500, tarif21_up: 5550, biayaAdmin: 10000 },
      { name: 'Rumah Tangga 1 (R1)', tarif1_10: 3375, tarif11_20: 3750, tarif21_up: 4650, biayaAdmin: 10000 },
      { name: 'Rumah Tangga 2 (R2)', tarif1_10: 3625, tarif11_20: 4700, tarif21_up: 7200, biayaAdmin: 10000 },
      { name: 'Rumah Tangga 3 (R3)', tarif1_10: 3975, tarif11_20: 5300, tarif21_up: 7650, biayaAdmin: 10000 },
      { name: 'Niaga Kecil (NK)', tarif1_10: 5250, tarif11_20: 6500, tarif21_up: 10500, biayaAdmin: 10000 },
      { name: 'Industri Rumah Tangga', tarif1_10: 5250, tarif11_20: 6500, tarif21_up: 10500, biayaAdmin: 10000 },
      { name: 'Instansi Pemerintah (PRT 2)', tarif1_10: 11250, tarif11_20: 11300, tarif21_up: 14150, biayaAdmin: 10000 },
      { name: 'R.S Swasta (RS 2)', tarif1_10: 5550, tarif11_20: 7450, tarif21_up: 9750, biayaAdmin: 10000 },
      { name: 'Industri & Niaga Besar', tarif1_10: 10200, tarif11_20: 11500, tarif21_up: 14150, biayaAdmin: 10000 },
      { name: 'Pelabuhan (Pel)', tarif1_10: 9700, tarif11_20: 11500, tarif21_up: 14150, biayaAdmin: 10000 }
    ];

    try {
      for (const item of defaults) {
        await addDoc(collection(db, 'tb_golongan'), item);
      }
      alert('Berhasil menambahkan data tarif default!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambahkan data default. Error: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Memuat Data Master Golongan...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-white">Master Tarif Golongan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola harga air per kubik (m³) berdasarkan golongan pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={seedDefaultData}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-200 transition-colors"
          >
            Load Data Default
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-[#00478d] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00478d]/20 hover:bg-[#003366] transition-colors"
          >
            <Plus size={18} />
            Tambah Golongan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {golongan.map((g) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={g.id} 
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm relative group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">ID: {g.id.substring(0, 5)}</span>
                <h3 className="text-xl font-headline font-black text-[#00478d] mt-2">{g.name}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(g)} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(g.id)} className="p-2 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Biaya Admin / Bulan</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(g.biayaAdmin)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tarif 1 - 10 m³</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(g.tarif1_10)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tarif 11 - 20 m³</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(g.tarif11_20)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tarif {'>'} 20 m³</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(g.tarif21_up)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-headline font-bold text-slate-800 dark:text-white">
                  {editingId ? 'Edit Golongan' : 'Tambah Golongan'}
                </h3>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Nama Golongan</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Rumah Tangga A"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-700 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Biaya Admin (Rp)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.biayaAdmin}
                      onChange={e => setFormData({...formData, biayaAdmin: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-700 focus:border-[#00478d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Tarif 1-10 m³ (Rp)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.tarif1_10}
                      onChange={e => setFormData({...formData, tarif1_10: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-700 focus:border-[#00478d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Tarif 11-20 m³ (Rp)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.tarif11_20}
                      onChange={e => setFormData({...formData, tarif11_20: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-700 focus:border-[#00478d] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Tarif {'>'} 20 m³ (Rp)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.tarif21_up}
                      onChange={e => setFormData({...formData, tarif21_up: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl text-slate-700 focus:border-[#00478d] outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[#00478d] text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-4 hover:bg-[#003366] transition-colors"
                >
                  <CheckCircle2 size={20} />
                  Simpan Golongan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
