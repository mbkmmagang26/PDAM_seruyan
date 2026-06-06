import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, updateDoc, query } from 'firebase/firestore';
import { Task } from './types';
import { useAuth } from './authContext';

interface TaskContextType {
  tasks: Task[];
  createTask: (taskData: any) => Promise<void>;
  assignTask: (taskId: string, staffId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: string, updates?: any) => Promise<void>;
  isLoading: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    // Listener tanpa orderBy dulu agar tidak nyangkut di masalah Index
    const unsubscribe = onSnapshot(collection(db, 'aksi_pengaduan'), (snapshot) => {
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Normalisasi format data dari aplikasi Pelanggan (PDAM_Pelanggan)
        const isFromPelanggan = data.type === 'Daftar Baru';
        
        return {
          id: doc.id,
          ...data,
          title: isFromPelanggan ? `Permohonan Baru: ${data.nama || 'Tanpa Nama'}` : data.title,
          type: isFromPelanggan ? 'new_connection' : data.type,
          location: isFromPelanggan ? data.alamat : data.location,
          priority: isFromPelanggan ? 'normal' : data.priority,
          status: (data.status === 'Menunggu Verifikasi' || isFromPelanggan) && !data.assignedTo ? 'pending' : data.status,
          district: isFromPelanggan ? 'Seruyan' : data.district,
          customerName: isFromPelanggan ? data.nama : data.customerName,
        };
      }) as Task[];
      
      console.log("Data Firestore Terdeteksi:", tasksData.length);
      setTasks(tasksData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createTask = async (taskData: any) => {
    try {
      const newId = `TSK-${Date.now()}`;
      
      // Hapus semua field yang bernilai undefined (Firebase menolak undefined)
      const cleanTaskData = Object.fromEntries(
        Object.entries(taskData).filter(([_, v]) => v !== undefined)
      );

      const newTask = {
        id: newId,
        createdAt: new Date().toISOString(),
        status: cleanTaskData.assignedTo ? 'assigned' : 'pending',
        assignedTo: cleanTaskData.assignedTo || null,
        ...cleanTaskData
      };
      await setDoc(doc(db, 'aksi_pengaduan', newId), newTask);
    } catch (error) {
      console.error("Gagal buat tugas:", error);
      throw error;
    }
  };

  const assignTask = async (taskId: string, staffId: string) => {
    try {
      await updateDoc(doc(db, 'aksi_pengaduan', taskId), {
        status: 'assigned',
        assignedTo: staffId
      });
    } catch (error) {
      console.error("Gagal assign:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string, updates?: any) => {
    try {
      const updateData = { status, ...(updates || {}) };
      await updateDoc(doc(db, 'aksi_pengaduan', taskId), updateData);
    } catch (error) {
      console.error("Gagal update status:", error);
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, createTask, assignTask, updateTaskStatus, isLoading }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
};