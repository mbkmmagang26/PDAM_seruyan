import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConnectionRequest } from './types';
import { useTasks } from './taskContext';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, setDoc } from 'firebase/firestore';

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

  useEffect(() => {
    const q = query(collection(db, 'tb_permohonan'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed data jika kosong (Data Contoh)
        const seedData = [
          {
            name: 'Rahmat Hidayat',
            phone: '081255566677',
            address: 'Jl. Tjilik Riwut No. 45, Kuala Pembuang',
            status: 'pending',
            date: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            name: 'Sari Puspita',
            phone: '085244433322',
            address: 'Perumahan Seruyan Asri Blok C-12',
            status: 'pending',
            date: new Date(Date.now() - 3600000 * 24).toISOString()
          },
          {
            name: 'Budi Santoso',
            phone: '081399988877',
            address: 'Jl. Ahmad Yani Gg. Merdeka No. 5',
            status: 'pending',
            date: new Date(Date.now() - 3600000 * 48).toISOString()
          },
          {
            name: 'Dewi Lestari',
            phone: '087711122233',
            address: 'Jl. Jendral Sudirman KM 3.5',
            status: 'pending',
            date: new Date(Date.now() - 3600000 * 72).toISOString()
          }
        ];
        
        // Jalankan seeding secara async dengan logging error
        seedData.forEach(async (data) => {
          try {
            await addDoc(collection(db, 'tb_permohonan'), data);
            console.log("✅ Berhasil membuat data contoh permohonan");
          } catch (e) {
            console.error("❌ Gagal membuat data contoh permohonan. Periksa Security Rules!", e);
          }
        });
      }

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
  }, []);

  const approveRequest = async (id: string, staffId?: string) => {
    try {
      const req = requests.find(r => r.id === id);
      if (!req) throw new Error("Permohonan tidak ditemukan");

      // 1. Update status di Firestore (tb_permohonan)
      await updateDoc(doc(db, 'tb_permohonan', id), {
        status: 'approved'
      });

      // 2. Tambahkan ke tb_pelanggan (Gunakan ID Permohonan sebagai Document ID agar tidak duplikat)
      // Ini juga menghindari error "Missing Index" di Firestore
      await setDoc(doc(db, 'tb_pelanggan', id), {
        nama: req.name,
        alamat: req.address,
        noHp: req.phone,
        status: 'Nonaktif',
        role: 'pelanggan',
        no_meter: '',
        id_pelanggan: 'MENUNGGU PASANG',
        gol: 'Rumah Tangga 2 (R2)',
        createdAt: new Date().toISOString(),
        permohonanId: id
      }, { merge: true });

      // 3. Create a new task automatically untuk Staff
      await createTask({
        title: `Pemasangan Baru: ${req.name}`, 
        location: req.address,
        district: 'Seruyan',
        priority: 'normal',
        type: 'new_connection',
        customerName: req.name,
        reason: 'Pemasangan Baru Sesuai Permohonan',
        assignedTo: staffId,
        deadline: 'CYCLE',
        permohonanId: id
      });

    } catch (error: any) {
      console.error("Gagal approve permohonan:", error);
      throw error;
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'tb_permohonan', id), {
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
