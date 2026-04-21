import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConnectionRequest } from './types';
import { useTasks } from './taskContext';

interface RequestContextType {
  requests: ConnectionRequest[];
  approveRequest: (id: string, staffId?: string) => void;
  rejectRequest: (id: string) => void;
  isLoading: boolean;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

const INITIAL_REQUESTS: ConnectionRequest[] = [
  {
    id: 'REQ-001',
    name: 'Ahmad Faisal',
    phone: '081234567890',
    address: 'Jl. Pemuda No. 12, Seruyan',
    status: 'pending',
    date: new Date().toISOString()
  },
  {
    id: 'REQ-002',
    name: 'Siti Aminah',
    phone: '085712345678',
    address: 'Komp. Beringin Blok B2',
    status: 'approved',
    date: new Date(Date.now() - 86400000).toISOString()
  }
];

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createTask } = useTasks();

  useEffect(() => {
    const storedRequests = localStorage.getItem('seruyan_db_requests');
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    } else {
      setRequests(INITIAL_REQUESTS);
      localStorage.setItem('seruyan_db_requests', JSON.stringify(INITIAL_REQUESTS));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('seruyan_db_requests', JSON.stringify(requests));
    }
  }, [requests, isLoading]);

  const approveRequest = (id: string, staffId?: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    // Update status
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'approved' } : r
    ));

    // Create a new task automatically
    createTask({
      title: '', 
      location: req.address,
      district: 'Seruyan', // default district for now
      priority: 'normal',
      type: 'new_connection',
      customerName: req.name,
      reason: 'Pemasangan Baru Sesuai Permohonan',
      assignedTo: staffId
    });
  };

  const rejectRequest = (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'rejected' } : r
    ));
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
