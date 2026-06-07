import React from 'react';
import { motion } from 'motion/react';
import { Waves, Activity, AlertTriangle, Droplets, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useLanguage } from '../../languageContext';

export default function WaterFlow() {
  const { t } = useLanguage();
  const zones = [
    { name: t('admin.waterflow.zone.north'), flow: '1,240 L/s', pressure: '4.2 bar', status: 'optimal', trend: 'up' },
    { name: t('admin.waterflow.zone.central'), flow: '2,850 L/s', pressure: '3.8 bar', status: 'optimal', trend: 'down' },
    { name: t('admin.waterflow.zone.west'), flow: '980 L/s', pressure: '2.1 bar', status: 'warning', trend: 'up' },
    { name: t('admin.waterflow.zone.south'), flow: '4,120 L/s', pressure: '5.5 bar', status: 'optimal', trend: 'up' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-headline font-bold text-slate-900 dark:text-white">{t('admin.waterflow.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.waterflow.subtitle')}</p>
      </header>

      {/* Real-time Graph Placeholder */}
      <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Waves size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-[#00478d] font-bold text-[10px] uppercase tracking-widest">{t('admin.waterflow.total')}</p>
              <h3 className="text-4xl font-headline font-extrabold">9,190 L/s</h3>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold">
              <Activity size={16} />
              {t('admin.waterflow.stable')}
            </div>
          </div>
          <div className="h-40 flex items-end gap-1">
            {[30, 45, 35, 60, 55, 70, 65, 80, 75, 90, 85, 95, 80, 70, 60].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                className="flex-1 bg-[#00478d]/40 rounded-t-sm"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Zone Grid */}
      <section className="grid grid-cols-2 gap-6">
        {zones.map((zone, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{zone.name}</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  zone.status === 'optimal' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {zone.status === 'optimal' ? t('admin.waterflow.stable') : t('common.urgent')}
                </span>
              </div>
              <div className={`p-2 rounded-xl ${zone.status === 'optimal' ? 'bg-slate-50 dark:bg-slate-900 text-[#00478d]' : 'bg-amber-50 text-amber-500'}`}>
                {zone.status === 'optimal' ? <Droplets size={20} /> : <AlertTriangle size={20} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{t('admin.waterflow.flow')}</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold">{zone.flow}</p>
                  {zone.trend === 'up' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-amber-500" />}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{t('admin.waterflow.pressure')}</p>
                <p className="text-sm font-bold">{zone.pressure}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
