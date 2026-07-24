import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

// Daftar tabel/collection history yang akan dihapus
const collectionsToDelete = [
  "tb_billing",             // Riwayat Tagihan & Pembayaran
  "tb_meter_pelanggan",     // Riwayat Catat Meteran
  "transactions",           // Riwayat Transaksi Jurnal (karena billing terkait transaksi)
  "pengaduan_pelanggan",    // Riwayat Komplain/Pengaduan
  "aksi_pengaduan"          // Riwayat Task Staff Lapangan
];

async function clearHistory() {
  console.log("Memulai proses penghapusan history pelanggan...");
  
  try {
    console.log("Login sebagai Admin untuk mendapatkan akses hapus data...");
    await signInWithEmailAndPassword(auth, "admin@pdam.com", "12345678");
    console.log("Login sukses!");
  } catch (error) {
    console.error("Gagal login sebagai admin:", error);
    process.exit(1);
  }

  for (const collectionName of collectionsToDelete) {
    try {
      console.log(`\nMencari data di collection: ${collectionName}...`);
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`-> Kosong. Tidak ada data di ${collectionName}.`);
        continue;
      }

      console.log(`-> Ditemukan ${snapshot.size} data di ${collectionName}. Menghapus...`);
      let deletedCount = 0;
      
      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, document.id));
        deletedCount++;
      }
      
      console.log(`-> Berhasil menghapus ${deletedCount} data dari ${collectionName}.`);
    } catch (error) {
      console.error(`-> Error saat menghapus ${collectionName}:`, error);
    }
  }
  
  console.log("\n=================================");
  console.log("SELESAI! Semua history telah dihapus.");
  console.log("Akun user, data master pelanggan (tb_pelanggan), COA, dan Tarif Golongan TIDAK disentuh.");
  console.log("=================================");
  process.exit(0);
}

clearHistory();
