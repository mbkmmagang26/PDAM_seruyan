export type UserRole = 'admin' | 'staff' | 'customer' | 'direktur' | 'manajer' | 'accounting' | 'pelanggan';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string; // Added for WA login
  address?: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'pending' | 'blocked';
  verificationCode?: string; // For Staff validation
  avatar?: string;
  golonganId?: string; // ID for Tarif Golongan
}

export interface Golongan {
  id: string;
  name: string;
  biayaAdmin: number;
  tarif1_10: number;
  tarif11_20: number;
  tarif21_up: number;
}

export interface MeterReading {
  id: string;
  customerId: string;
  month: string; // e.g., '2023-10'
  year: string;
  standAwal: number;
  standAkhir: number;
  pemakaian: number;
  fotoUrl?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  location: string;
  district: string;
  priority: 'high' | 'normal';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed';
  type: 'repair' | 'reading' | 'disconnection' | 'new_connection';
  assignedTo?: string; // Staff ID
  customerId?: string;
  customerName?: string;
  reason?: string; // e.g. "Overdue Bills" or "Customer Request"
  deadline?: string;
  completedAt?: string;
  report?: {
    image?: string;
    notes?: string;
    signature?: string;
  };
  pengaduanId?: string; // <--- INI YANG DITAMBAHKAN
  permohonanId?: string;
}

export interface Bill {
  id: string;
  customerId: string;
  customerName?: string;
  meterReadingId?: string;
  month: string;
  year: string;
  usage: number;
  biayaAdmin: number;
  biayaPemakaian: number;
  amount: number; // Total amount (biayaAdmin + biayaPemakaian)
  paidDate?: string;
  status: 'paid' | 'unpaid';
  createdAt: string;
  periodeBulan?: string;
  periodeTahun?: string;
  totalTagihan?: number;
}

export interface ConnectionRequest {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  userId?: string;
}