import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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
const db = getFirestore(app);

async function clean() {
  const snap = await getDocs(collection(db, 'notifikasi_pengguna'));
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.title === 'DRD Berhasil Diposting') {
      await deleteDoc(doc(db, 'notifikasi_pengguna', d.id));
      count++;
    }
  }
  console.log('Deleted ' + count + ' dummy notifications');
}
clean().catch(console.error);
