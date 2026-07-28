import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConnectionRequest } from './types';
import { useTasks } from './taskContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './authContext';
import { generateSearchTokens } from './lib/searchUtils';


interface RequestContextType {
  requests: ConnectionRequest[];
  approveRequest: (id: string, staffId?: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  isLoading: boolean;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createTask } = useTasks();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'permohonan_pasang_baru'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const permohonanData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConnectionRequest[];
      
      setRequests(permohonanData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error in RequestContext:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const approveRequest = async (id: string, staffId?: string) => {
    try {
      const req = requests.find(r => r.id === id);
      if (!req) throw new Error("Permohonan tidak ditemukan");

      // 1. Update status di Firestore (tb_permohonan)
      await updateDoc(doc(db, 'permohonan_pasang_baru', id), {
        status: 'approved'
      });

      // 2. Data Pelanggan sudah ada sejak Registrasi, tidak perlu buat dokumen yatim (orphan) baru.
      // Akan diupdate oleh Staff saat pekerjaan selesai.      // 3. Create a new task automatically untuk Staff
      await createTask({
        title: `Penyambungan Baru: ${req.name}`, 
        location: req.address,
        district: 'Seruyan',
        priority: 'normal',
        type: 'new_connection',
        customerName: req.name,
        reason: 'Pemasangan Baru Sesuai Permohonan',
        assignedTo: staffId,
        deadline: 'CYCLE',
        permohonanId: id,
        userId: req.userId || ''
      });

    } catch (error: any) {
      console.error("Gagal approve permohonan:", error);
      throw error;
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'permohonan_pasang_baru', id), {
        status: 'rejected'
      });
    } catch (error) {
      console.error("Gagal reject permohonan:", error);
      throw error;
    }
  };

  return (
    <RequestContext.Provider value={{ requests, approveRequest, rejectRequest, isLoading }}>
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
}

