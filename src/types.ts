export type UserRole = 'admin' | 'staff' | 'customer';

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
}

export interface Bill {
  id: string;
  month: string;
  year: string;
  amount: number;
  usage: number;
  paidDate: string;
  status: 'paid' | 'unpaid';
}

export interface ConnectionRequest {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}
