import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
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

async function seedAccountingSampleData() {
  console.log("🌱 SEEDING SAMPLE DATA AKUNTANSI & OPERASIONAL...\n");

  try {
    await signInWithEmailAndPassword(auth, "admin@pdam.com", "12345678");
    console.log("🔓 Authenticated as Admin (admin@pdam.com)");
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    process.exit(1);
  }

  // 1. Seed Sample Persediaan / Inventory
  const sampleInventory = [
    { name: "Pipa PVC 2 Inch", category: "Pipa & Sambungan", unit: "Batang", stock: 45, minStock: 10, price: 65000 },
    { name: "Pipa HDPE 1/2 Inch", category: "Pipa & Sambungan", unit: "Meter", stock: 120, minStock: 25, price: 15000 },
    { name: "Water Meter 1/2 Inch Digital", category: "Water Meter", unit: "Unit", stock: 20, minStock: 5, price: 350000 },
    { name: "Kaporit Powder (Chlorine)", category: "Chemical / Kaporit", unit: "Kg", stock: 8, minStock: 10, price: 45000 },
    { name: "Lem Pipa PVC High Quality", category: "Pipa & Sambungan", unit: "Kaleng", stock: 15, minStock: 5, price: 25000 }
  ];

  for (const item of sampleInventory) {
    await addDoc(collection(db, 'stok_material_pipa'), {
      ...item,
      createdAt: serverTimestamp(),
      authorId: 'admin-system',
      authorName: 'Admin PDAM'
    });
  }
  console.log(`✅ Seeded ${sampleInventory.length} item Persediaan (stok_material_pipa)`);

  // 2. Seed Sample Vendors / Hutang AP
  const sampleVendors = [
    { company: "PT. Riau Mas Pipa Mandiri", name: "Bpk. Hendra", phone: "081299887766", address: "Jl. Industri No 45, Pekanbaru", balance: 15500000 },
    { company: "CV. Water Meter Indonesia", name: "Ibu Siska", phone: "085211223344", address: "Kawasan Industri MM2100", balance: 7000000 },
    { company: "Toko Material Subur Jaya", name: "Bpk. Koh Liong", phone: "081377665544", address: "Jl. Merdeka No 12, Seruyan", balance: 0 }
  ];

  for (const v of sampleVendors) {
    await addDoc(collection(db, 'mitra_vendor_pemasok'), {
      ...v,
      createdAt: serverTimestamp(),
      authorId: 'admin-system',
      authorName: 'Admin PDAM'
    });
  }
  console.log(`✅ Seeded ${sampleVendors.length} Vendor Pemasok (mitra_vendor_pemasok)`);

  // 3. Seed Sample Jurnal Transaksi Keuangan (Transactions)
  const sampleTransactions = [
    {
      date: new Date().toISOString().split('T')[0],
      reference: "BKM-2026-001",
      description: "Penerimaan Kas Pelunasan Tagihan Air Bulan Juli 2026",
      type: "income",
      category: "4010",
      amount: 12500000,
      status: "verified",
      authorName: "Akuntan PDAM"
    },
    {
      date: new Date().toISOString().split('T')[0],
      reference: "BKK-2026-002",
      description: "Pembelian Bahan Kimia Kaporit untuk Pengolahan Air",
      type: "expense",
      category: "92.02.10",
      amount: 3600000,
      status: "verified",
      authorName: "Akuntan PDAM"
    },
    {
      date: new Date().toISOString().split('T')[0],
      reference: "BKK-2026-003",
      description: "Pemeliharaan Mesin Pompa Intake Pusat",
      type: "expense",
      category: "92.03.10",
      amount: 2400000,
      status: "verified",
      authorName: "Akuntan PDAM"
    }
  ];

  for (const tx of sampleTransactions) {
    await addDoc(collection(db, 'jurnal_transaksi_keuangan'), {
      ...tx,
      createdAt: serverTimestamp()
    });
  }
  console.log(`✅ Seeded ${sampleTransactions.length} Jurnal Transaksi Keuangan (jurnal_transaksi_keuangan)`);

  // 4. Seed Sample Aset Tetap
  const sampleAssets = [
    { name: "Pompa Water Intake 50 HP", category: "Mesin & Pompa", buyDate: "2024-01-15", cost: 85000000, status: "Baik" },
    { name: "Gedung Kantor Pusat PDAM", category: "Bangunan", buyDate: "2020-05-10", cost: 450000000, status: "Baik" }
  ];

  for (const ast of sampleAssets) {
    await addDoc(collection(db, 'inventaris_aset_tetap'), {
      ...ast,
      createdAt: serverTimestamp()
    });
  }
  console.log(`✅ Seeded ${sampleAssets.length} Aset Tetap (inventaris_aset_tetap)`);

  console.log("\n🌱 SEEDING SAMPLE DATA AKUNTANSI SELESAI!");
  process.exit(0);
}

seedAccountingSampleData();
