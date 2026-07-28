import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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

const collectionsToClear = [
  'stok_material_pipa',
  'mitra_vendor_pemasok',
  'jurnal_transaksi_keuangan',
  'inventaris_aset_tetap',
  'tagihan_air_pelanggan',
  'pembacaan_meter_staf',
  'permohonan_pasang_baru',
  'pengaduan_layanan_pelanggan',
  'tugas_perbaikan_staf',
  'anggaran_operasional',
  'laporan_penagihan_kasir',
  'log_aktivitas_pelanggan',
  'log_aktivitas_staf_admin',
  'notifikasi_pengguna',
  'data_pelanggan_meteran'
];

async function clearAllDummyData() {
  console.log("🧹 MEMBERSIONALKAN SELURUH DATA DUMMY DARI FIRESTORE...\n");

  try {
    await signInWithEmailAndPassword(auth, "admin@pdam.com", "12345678");
    console.log("🔓 Authenticated as Admin (admin@pdam.com)");
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    process.exit(1);
  }

  let totalDeleted = 0;

  for (const collName of collectionsToClear) {
    const snap = await getDocs(collection(db, collName));
    let count = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, collName, d.id));
      count++;
    }
    totalDeleted += count;
    console.log(`✅ Cleared ${count} documents from '${collName}'`);
  }

  console.log(`\n🎉 SELESAI! Total ${totalDeleted} dokumen dummy telah berhasil dibersihkan.`);
  console.log("🔒 Data Master yang dipertahankan: user_admin, master_tarif_air, coa");
  process.exit(0);
}

clearAllDummyData();
