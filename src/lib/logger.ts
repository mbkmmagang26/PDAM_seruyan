import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

export const logActivity = async (user: User | null, action: string, details: string = '') => {
  if (!user) return;
  try {
    await addDoc(collection(db, 'tb_activity_logs'), {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity', error);
  }
};
