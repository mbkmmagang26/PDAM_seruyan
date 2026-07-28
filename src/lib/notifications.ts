import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface NotificationPayload {
  title: string;
  message: string;
  userId?: string; 
  type?: 'info' | 'success' | 'warning' | 'error';
}

export async function sendNotification(payload: NotificationPayload) {
  try {
    await addDoc(collection(db, 'notifikasi_pengguna'), {
      ...payload,
      userId: payload.userId || 'all',
      read: false,
      createdAt: serverTimestamp(),
      authorId: auth.currentUser?.uid || 'system'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

