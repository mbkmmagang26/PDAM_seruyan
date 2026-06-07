import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import DRDView from './DRD';
import LPPView from './LPP';
import RekonsiliasiView from './Rekonsiliasi';

export default function ImportDataView() {
  const [activeTab, setActiveTab] = useState<'drd' | 'lpp' | 'rekonsiliasi'>('drd');

  const tabs = [
    { id: 'drd', label: 'DRD (Rekening Ditagihkan)', icon: UploadCloud, component: <DRDView /> },
    { id: 'lpp', label: 'LPP (Penerimaan Penagihan)', icon: FileSpreadsheet, component: <LPPView /> },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi (Rekap User)', icon: ShieldCheck, component: <RekonsiliasiView /> },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabs.find(t => t.id === activeTab)?.component}
      </div>
    </div>
  );
}
