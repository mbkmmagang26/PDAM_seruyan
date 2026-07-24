import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMQCTg56AeyXjdCvq4pteO4IPTBCW29TY",
  authDomain: "pdam-seruyan.firebaseapp.com",
  projectId: "pdam-seruyan",
  storageBucket: "pdam-seruyan.firebasestorage.app",
  messagingSenderId: "991841589080",
  appId: "1:991841589080:web:099fdb08595e9231dcb72d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function findUser() {
  const emailToFind = "naldo0wc@gmail.com";
  console.log(`Mencari akun ${emailToFind} di Firebase...`);
  
  let found = false;

  try {
    // Authenticate first
    await signInWithEmailAndPassword(auth, "fanntek71@gmail.com", "12345678");
    console.log("Logged in as direktur to bypass rules...");

    // Cari di tb_pelanggan (pencarian berdasarkan email atau username)
    const pelangganCol = collection(db, 'tb_pelanggan');
    const q1 = query(pelangganCol, where("email", "==", emailToFind));
    const snap1 = await getDocs(q1);
    
    if (!snap1.empty) {
      console.log("\n✅ Ditemukan di koleksi 'tb_pelanggan' (pencarian by email):");
      snap1.forEach(doc => console.log("- ID Dokumen:", doc.id, "\n- Data:", doc.data()));
      found = true;
    } else {
      const q1b = query(pelangganCol, where("username", "==", emailToFind));
      const snap1b = await getDocs(q1b);
      if (!snap1b.empty) {
        console.log("\n✅ Ditemukan di koleksi 'tb_pelanggan' (pencarian by username):");
        snap1b.forEach(doc => console.log("- ID Dokumen:", doc.id, "\n- Data:", doc.data()));
        found = true;
      }
    }

    // Cari di user_admin
    const adminCol = collection(db, 'user_admin');
    const q2 = query(adminCol, where("email", "==", emailToFind));
    const snap2 = await getDocs(q2);
    
    if (!snap2.empty) {
      console.log("\n✅ Ditemukan di koleksi 'user_admin':");
      snap2.forEach(doc => console.log("- ID Dokumen:", doc.id, "\n- Data:", doc.data()));
      found = true;
    }

    if (!found) {
      console.log(`\n❌ Akun ${emailToFind} TIDAK DITEMUKAN di koleksi tb_pelanggan maupun user_admin.`);
      console.log("Artinya akun ini HANYA tersimpan di Firebase Authentication, tetapi gagal/belum tersimpan ke Firestore.");
    }

  } catch (error) {
    console.error("Gagal melakukan pencarian. Pastikan Rules Firestore Anda (allow read: if true) sudah di-publish.", error.message);
  }
  
  process.exit(0);
}

findUser();
