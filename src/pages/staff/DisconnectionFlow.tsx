import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Camera, 
  MapPin, 
  User, 
  AlertCircle,
  Scissors,
  CheckCircle2,
  Package,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTasks } from '../../taskContext';
import { useLanguage } from '../../languageContext';
import { useAuth } from '../../authContext';
import { logActivity } from '../../lib/logger';

export default function DisconnectionFlow() {
  const { user: staff } = useAuth();
  const { taskId } = useParams();
  const { tasks, updateTaskStatus } = useTasks();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const task = tasks.find(t => t.id === taskId);

  if (!task) return <div className="p-8 text-center font-bold">{t('admin.tasks.not_found')}</div>;

  const handleComplete = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      updateTaskStatus(task.id, 'completed', {
        notes: 'Meter physically removed and pipe sealed. Photo attached.',
        image: 'https://images.unsplash.com/photo-1590231804368-6c8a3074780d?w=400&h=300&fit=crop'
      });
      logActivity(staff, 'Selesai Pemutusan', `Menyelesaikan tugas pemutusan sambungan ID: ${task.id}`);
      setStep(4);
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="px-6 h-16 flex items-center bg-white border-b border-slate-100 flex-shrink-0">
        <button onClick={() => navigate('/staff')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="ml-2 text-lg font-headline font-bold">{t('staff.disconnection.title')}</h1>
      </header>

      <main className="flex-1 p-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3 text-amber-700">
                  <AlertCircle size={24} />
                  <h2 className="font-headline font-bold">{t('staff.disconnection.verify')}</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={18} className="text-amber-500" />
                    <span className="font-bold">{task.customerName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin size={18} className="text-amber-500" />
                    <span>{task.location}, {task.district}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-200 mt-2">
                    <p className="text-[10px] uppercase font-black text-amber-700/50">{t('admin.tasks.label.reason')}</p>
                    <p className="text-xs font-bold text-amber-800">{task.reason}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 space-y-4">
                <h3 className="font-bold text-slate-800">{t('staff.disconnection.checklist')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5 accent-primary" />
                    <span className="text-sm font-medium">{t('staff.tasks.verify_meter').replace('{id}', task.id.split('-')[1])}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5 accent-primary" />
                    <span className="text-sm font-medium">{t('staff.tasks.warning_resident')}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full bg-[#00478d] text-white py-5 rounded-full font-bold shadow-lg shadow-[#00478d]/20 flex items-center justify-center gap-2 group"
              >
                {t('staff.disconnection.button.continue')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center py-4">
                 <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scissors size={40} />
                 </div>
                 <h2 className="text-2xl font-headline font-bold">{t('staff.disconnection.action.title')}</h2>
                 <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('staff.disconnection.action.subtitle')}</p>
              </div>

              <div 
                onClick={() => setPhotoUploaded(true)}
                className={`w-full aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  photoUploaded ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {photoUploaded ? (
                  <>
                    <img src="https://images.unsplash.com/photo-1590231804368-6c8a3074780d?w=400&h=300&fit=crop" className="w-full h-full object-cover rounded-[2.5rem]" />
                    <div className="absolute inset-x-0 bottom-6 flex justify-center">
                       <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <CheckCircle2 size={14} /> Photo Captured
                       </span>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={48} className="text-slate-300 mb-3" />
                    <span className="text-sm font-bold text-slate-400">{t('staff.disconnection.proof')}</span>
                  </>
                )}
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('staff.disconnection.notes')}</label>
                 <textarea 
                   className="w-full bg-slate-50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/10 outline-none" 
                   rows={3}
                   placeholder="..."
                 ></textarea>
              </div>

              <button 
                onClick={() => setStep(3)}
                disabled={!photoUploaded}
                className="w-full bg-[#00478d] text-white py-5 rounded-full font-bold shadow-lg shadow-[#00478d]/20 disabled:opacity-50 disabled:shadow-none"
              >
                {t('staff.disconnection.submit')}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 flex flex-col items-center justify-center py-12"
            >
              <div className="w-24 h-24 bg-[#00478d]/10 text-[#00478d] rounded-full flex items-center justify-center relative shadow-inner">
                <ShieldCheck size={48} />
                <motion.div 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-dotted border-primary/30 rounded-full"
                />
              </div>
              <div className="text-center space-y-2">
                 <h2 className="text-2xl font-headline font-bold">{t('staff.disconnection.confirm.title')}</h2>
                 <p className="text-sm text-slate-500">{t('staff.disconnection.confirm.subtitle')}</p>
              </div>

              <div className="w-full space-y-3">
                 <button 
                   onClick={handleComplete}
                   disabled={isSubmitting}
                   className="w-full bg-error text-white py-5 rounded-full font-bold shadow-lg shadow-error/20 flex items-center justify-center gap-3"
                 >
                    {isSubmitting ? 'Processing...' : (
                      <>
                        <Scissors size={20} /> {t('staff.disconnection.button.finalize')}
                      </>
                    )}
                 </button>
                 <button 
                   onClick={() => setStep(2)}
                   className="w-full py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                 >
                    Go Back & Edit
                 </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
             <motion.div 
               key="step4"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="h-full flex flex-col items-center justify-center text-center space-y-8"
             >
                <div className="w-32 h-32 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                   <CheckCircle2 size={64} />
                </div>
                <div className="space-y-4">
                   <h2 className="text-3xl font-headline font-bold">{t('staff.disconnection.success.title')}</h2>
                   <p className="text-sm text-slate-500 px-8">{t('staff.disconnection.success.subtitle').replace('{name}', task.customerName)}</p>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-[2rem] w-full text-left space-y-2 border border-slate-100">
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Order Reference</span>
                      <span>Execution Time</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>{task.id}</span>
                      <span>Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                </div>

                <button 
                  onClick={() => navigate('/staff')}
                  className="w-full bg-slate-900 text-white py-5 rounded-full font-bold shadow-xl shadow-slate-900/20"
                >
                   {t('staff.disconnection.return')}
                </button>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
