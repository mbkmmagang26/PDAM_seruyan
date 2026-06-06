import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMQCTg56AeyXjdCvq4pteO4IPTBCW29TY",
  authDomain: "pdam-seruyan.firebaseapp.com",
  projectId: "pdam-seruyan",
  storageBucket: "pdam-seruyan.firebasestorage.app",
  messagingSenderId: "991841589080",
  appId: "1:991841589080:web:099fdb08595e9231dcb72d",
  measurementId: "G-0L06CRMVVX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fix() {
  try {
    console.log('Signing in...');
    await signInWithEmailAndPassword(auth, 'fanntek71@gmail.com', '12345678');
    console.log('Signed in successfully!');

    const q = query(collection(db, 'tb_pelanggan'), where('nama', '==', 'ikhyalast'));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log('Customer ikhyalast not found');
      process.exit(0);
    }
    const customer = snap.docs[0];
    const customerId = customer.id;
    console.log('Found customer:', customerId);

    // 1. Delete from tb_billing (fetch and filter in JS)
    console.log('Searching for large bills...');
    const billQ = query(collection(db, 'tb_billing'), where('customerId', '==', customerId));
    const billSnap = await getDocs(billQ);
    for (const billDoc of billSnap.docs) {
      const data = billDoc.data();
      if (data.amount > 7000000) {
        console.log('Deleting bill:', billDoc.id, 'Amount:', data.amount);
        await deleteDoc(doc(db, 'tb_billing', billDoc.id));
      }
    }

    // 2. Delete from tb_meterpelanggan (fetch and filter in JS)
    console.log('Searching for 1000m3 readings...');
    const meterQ = query(collection(db, 'tb_meter_pelanggan'), where('customerId', '==', customerId));
    const meterSnap = await getDocs(meterQ);
    for (const meterDoc of meterSnap.docs) {
      const data = meterDoc.data();
      if (data.standAkhir === 1000) {
        console.log('Deleting meter reading:', meterDoc.id);
        await deleteDoc(doc(db, 'tb_meter_pelanggan', meterDoc.id));
      }
    }

    // 3. Reset tagihanTunggakan
    await updateDoc(doc(db, 'tb_pelanggan', customerId), {
      tagihanTunggakan: 0,
      lastUpdated: new Date().toISOString()
    });
    console.log('Updated customer tagihanTunggakan to 0');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fix();
