import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset,
  getAuth,
  User as FirebaseUser
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { User, UserRole } from './types';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, phone: string, address: string, password: string, role: UserRole, gol?: string) => Promise<{ success: boolean; status: 'active' | 'pending' }>;
  verifyCode: (emailOrPhone: string, code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUserStatus: (userId: string, status: 'active' | 'pending' | 'blocked') => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmNewPassword: (code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to fetch user details from either user_admin or tb_pelanggan
  const fetchUserById = async (uid: string): Promise<User | null> => {
    try {
      // 1. Cek di user_admin
      const userAdminRef = doc(db, 'user_admin', uid);
      const userAdminDoc = await getDoc(userAdminRef);
      if (userAdminDoc.exists()) {
        const data = userAdminDoc.data();
        return { ...data, id: uid } as User;
      }

      // 2. Cek di tb_pelanggan
      const pelangganRef = doc(db, 'tb_pelanggan', uid);
      const pelangganDoc = await getDoc(pelangganRef);
      if (pelangganDoc.exists()) {
        const data = pelangganDoc.data();
        return {
          id: uid,
          name: data.nama || 'Pelanggan',
          email: data.email || '',
          phone: data.noHp || '',
          address: data.alamat || '',
          role: 'pelanggan',
          status: data.status_akun || (data.status === 'Nonaktif' ? 'blocked' : 'active'),
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama || 'Pelanggan')}&background=random`
        } as User;
      }

      // 3. Fallback query by userId field in tb_pelanggan
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'tb_pelanggan'), where('userId', '==', uid));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.nama || 'Pelanggan',
          email: data.email || '',
          phone: data.noHp || '',
          address: data.alamat || '',
          role: 'pelanggan',
          status: data.status_akun || (data.status === 'Nonaktif' ? 'blocked' : 'active'),
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nama || 'Pelanggan')}&background=random`
        } as User;
      }
    } catch (err) {
      console.error('Error fetching user by ID:', err);
    }
    return null;
  };

  // Sync current user profile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserById(firebaseUser.uid);
        if (userData) {
          if (userData.status === 'active') {
            setUser(userData);
          } else {
            setUser(null);
            await signOut(auth);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync all users for Admin (only from user_admin)
  useEffect(() => {
    if (user?.role === 'admin') {
      const q = collection(db, 'user_admin');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
          usersList.push({ ...(doc.data() as User), id: doc.id });
        });
        setAllUsers(usersList);
      });
      return () => unsubscribe();
    } else {
      setAllUsers([]);
    }
  }, [user]);

  const login = async (emailOrPhone: string, password?: string) => {
    try {
      if (!password) {
        return { success: false, message: 'Password is required' };
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailOrPhone, password);
      const firebaseUser = userCredential.user;

      const userData = await fetchUserById(firebaseUser.uid);
      if (!userData) {
        await signOut(auth);
        return { success: false, message: 'Account details not found in database' };
      }

      if (userData.status === 'pending') {
        await signOut(auth);
        return { success: false, message: 'PENDING_VERIFICATION' };
      }

      if (userData.status === 'blocked') {
        await signOut(auth);
        return { success: false, message: 'Account blocked' };
      }

      // Backfill password to Firestore if missing
      if (!userData.password) {
        if (userData.role === 'pelanggan' || userData.role === 'customer') {
          await updateDoc(doc(db, 'tb_pelanggan', userData.id), { password });
        } else {
          await updateDoc(doc(db, 'user_admin', firebaseUser.uid), { password });
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Invalid email or password';
      if (error.code === 'auth/user-not-found') message = 'Account not found';
      if (error.code === 'auth/wrong-password') message = 'Invalid password';
      return { success: false, message };
    }
  };

  const register = async (name: string, email: string, phone: string, address: string, password: string, role: UserRole, gol?: string) => {
    try {
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const firebaseUser = userCredential.user;

      const isStaff = role === 'staff';
      const status = isStaff ? 'pending' : 'active';

      const verificationCode = isStaff
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : null;

      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

      if (role === 'customer' || role === 'pelanggan') {
        // Simpan langsung ke tb_pelanggan menggunakan UID Auth
        const newUserPelanggan: any = {
          userId: firebaseUser.uid,
          nama: name,
          email,
          noHp: phone,
          alamat: address,
          password,
          role: 'pelanggan',
          status: 'Aktif',
          status_akun: status,
          no_meter: '',
          id_pelanggan: 'PELANGGAN BARU',
          gol: gol || 'Rumah Tangga 2 (R2)',
          createdAt: new Date().toISOString(),
          avatar
        };
        await setDoc(doc(db, 'tb_pelanggan', firebaseUser.uid), newUserPelanggan);
      } else {
        // Simpan ke user_admin
        const newUserAdmin: any = {
          id: firebaseUser.uid,
          name,
          email,
          phone,
          address,
          password,
          role,
          status,
          avatar
        };
        if (verificationCode) {
          newUserAdmin.verificationCode = verificationCode;
        }
        await setDoc(doc(db, 'user_admin', firebaseUser.uid), newUserAdmin);
      }

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      return { success: true, status: status as 'active' | 'pending' };
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already registered');
      }
      throw error;
    }
  };

  const verifyCode = async (emailOrPhone: string, code: string) => {
    try {
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'user_admin'), where('email', '==', emailOrPhone));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const userDoc = querySnap.docs[0];
        const userData = userDoc.data();
        if (userData.verificationCode === code) {
          await updateDoc(doc(db, 'user_admin', userDoc.id), { status: 'active', verificationCode: null });
          return { success: true };
        }
      }
      return { success: false, message: 'Invalid verification code' };
    } catch (error) {
      return { success: false, message: 'Verification failed' };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'pending' | 'blocked') => {
    try {
      const adminDoc = await getDoc(doc(db, 'user_admin', userId));
      if (adminDoc.exists()) {
        await updateDoc(doc(db, 'user_admin', userId), { status });
      } else {
        await updateDoc(doc(db, 'tb_pelanggan', userId), { status_akun: status });
      }
    } catch (error) {
      console.error('Update user status error:', error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      let message = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      return { success: false, message };
    }
  };

  const confirmNewPassword = async (code: string, newPassword: string) => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
      return { success: true };
    } catch (error: any) {
      console.error('Confirm password error:', error);
      let message = 'Failed to update password';
      if (error.code === 'auth/expired-action-code') message = 'Reset link has expired';
      if (error.code === 'auth/invalid-action-code') message = 'Reset link is invalid or already used';
      if (error.code === 'auth/weak-password') message = 'Password is too weak';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      allUsers,
      login,
      register,
      verifyCode,
      logout,
      updateUserStatus,
      sendPasswordReset,
      confirmNewPassword,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
