import React from 'react';

export default function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 p-8 text-center h-[calc(100vh-120px)] flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl font-bold">{title.charAt(0)}</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Modul {title}</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Modul ini sedang dalam tahap pengembangan. Fitur {title} akan segera tersedia dengan integrasi penuh ke database Firestore.
      </p>
    </div>
  );
}
