import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMQCTg56AeyXjdCvq4pteO4IPTBCW29TY",
  authDomain: "pdam-seruyan.firebaseapp.com",
  projectId: "pdam-seruyan",
  storageBucket: "pdam-seruyan.firebasestorage.app",
  messagingSenderId: "991841589080",
  appId: "1:991841589080:web:099fdb08595e9231dcb72d",
  measurementId: "G-0L06CRMVVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runMigration() {
  console.log("=== MEMULAI MIGRASI DATA DATABASE PDAM ===");

  try {
    console.log("Melakukan autentikasi sebagai Admin...");
    await signInWithEmailAndPassword(auth, "admin@pdam.com", "12345678");
    console.log("Autentikasi berhasil!");
  } catch (authError: any) {
    console.error("Gagal melakukan autentikasi admin:", authError.message);
    process.exit(1);
  }

  // 1. Migrasi tb_pelanggan
  try {
    console.log("\n[1/2] Memeriksa koleksi 'tb_pelanggan'...");
    const pelangganSnap = await getDocs(collection(db, "tb_pelanggan"));
    let pelangganUpdated = 0;

    for (const d of pelangganSnap.docs) {
      const data = d.data();
      const updates: any = {};

      // Jika golongan tidak ada tetapi gol ada
      if (!data.golongan && data.gol) {
        updates.golongan = data.gol;
      }
      // Jika gol tidak ada tetapi golongan ada
      if (!data.gol && data.golongan) {
        updates.gol = data.golongan;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "tb_pelanggan", d.id), updates);
        pelangganUpdated++;
        console.log(`- Update pelanggan [ID: ${d.id}]:`, updates);
      }
    }
    console.log(`Selesai memeriksa tb_pelanggan. ${pelangganUpdated} dokumen diperbarui.`);
  } catch (error) {
    console.error("Gagal memigrasi tb_pelanggan:", error);
  }

  // 2. Migrasi pengaduan_pelanggan
  try {
    console.log("\n[2/2] Memeriksa koleksi 'pengaduan_pelanggan'...");
    const pengaduanSnap = await getDocs(collection(db, "pengaduan_pelanggan"));
    let pengaduanUpdated = 0;

    for (const d of pengaduanSnap.docs) {
      const data = d.data();
      const updates: any = {};

      // Mapping namaPelanggan -> userName
      if (data.namaPelanggan && !data.userName) {
        updates.userName = data.namaPelanggan;
      }
      // Mapping nomorSambungan -> userNoMeter
      if (data.nomorSambungan && !data.userNoMeter) {
        updates.userNoMeter = data.nomorSambungan;
      }
      // Mapping deskripsi -> description
      if (data.deskripsi && !data.description) {
        updates.description = data.deskripsi;
      }

      // Standardisasi status
      if (data.status === "Menunggu" || !data.status) {
        updates.status = "Menunggu Respon";
      } else if (data.status === "Sedang Diproses") {
        updates.status = "Diproses";
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "pengaduan_pelanggan", d.id), updates);
        pengaduanUpdated++;
        console.log(`- Update pengaduan [ID: ${d.id}]:`, updates);
      }
    }
    console.log(`Selesai memeriksa pengaduan_pelanggan. ${pengaduanUpdated} dokumen diperbarui.`);
  } catch (error) {
    console.error("Gagal memigrasi pengaduan_pelanggan:", error);
  }

  console.log("\n=== MIGRASI SELESAI ===");
  process.exit(0);
}

runMigration();
