import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, updateDoc, query } from 'firebase/firestore';
import { Task } from './types';

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

  useEffect(() => {
    // Listener tanpa orderBy dulu agar tidak nyangkut di masalah Index
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
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
  }, []);

  const createTask = async (taskData: any) => {
    try {
      const newId = `TSK-${Date.now()}`;
      const newTask = {
        id: newId,
        status: 'pending',
        assignedTo: null,
        createdAt: new Date().toISOString(),
        ...taskData
      };
      await setDoc(doc(db, 'tasks', newId), newTask);
    } catch (error) {
      console.error("Gagal buat tugas:", error);
    }
  };

  const assignTask = async (taskId: string, staffId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
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
      await updateDoc(doc(db, 'tasks', taskId), updateData);
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