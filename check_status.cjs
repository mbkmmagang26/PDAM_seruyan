const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBuPpOQC_xQtWr8GrO14F2kBxCO5vFcJJY",
  authDomain: "sia-tirta-seruyan.firebaseapp.com",
  projectId: "sia-tirta-seruyan",
  storageBucket: "sia-tirta-seruyan.appspot.com",
  messagingSenderId: "886672279869",
  appId: "1:886672279869:web:ebe8cffa40d5e13de0fe5d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStatus() {
  console.log('\n====== CEK JURNAL TRANSAKSI KEUANGAN ======\n');
  
  try {
    const snap = await getDocs(collection(db, 'jurnal_transaksi_keuangan'));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`Total transaksi: ${docs.length}`);
    
    // Group by status
    const byStatus = {};
    docs.forEach(d => {
      const s = d.status || 'NO_STATUS';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    console.log('\nBreakdown per STATUS:');
    Object.entries(byStatus).forEach(([s, count]) => console.log(`  ${s}: ${count} transaksi`));

    // Group by authorId
    const byAuthor = {};
    docs.forEach(d => {
      const a = d.authorId || 'UNKNOWN';
      byAuthor[a] = (byAuthor[a] || 0) + 1;
    });
    console.log('\nBreakdown per AUTHOR:');
    Object.entries(byAuthor).forEach(([a, count]) => console.log(`  ${a}: ${count} transaksi`));

    // Group by type
    const byType = {};
    docs.forEach(d => {
      const t = d.type || 'NO_TYPE';
      byType[t] = (byType[t] || 0) + 1;
    });
    console.log('\nBreakdown per TYPE:');
    Object.entries(byType).forEach(([t, count]) => console.log(`  ${t}: ${count} transaksi`));

    // Sample 5 non-billing transactions
    const nonBilling = docs.filter(d => d.authorId !== 'system-billing').slice(0, 5);
    if (nonBilling.length > 0) {
      console.log('\nContoh 5 transaksi NON-billing:');
      nonBilling.forEach(d => {
        console.log(`  [${d.status}] ${d.type} | Rp${d.amount} | author: ${d.authorId} | ket: ${d.description || d.keterangan || '-'}`);
      });
    }

    // How many would be blocked by the current filter?
    const blocked = docs.filter(d => d.status === 'pending' && d.authorId !== 'system-billing');
    console.log(`\n❌ Transaksi PENDING non-billing (tidak masuk laporan): ${blocked.length}`);
    
    const passed = docs.filter(d => d.status !== 'rejected' && !(d.status === 'pending' && d.authorId !== 'system-billing'));
    console.log(`✅ Transaksi yang MASUK laporan saat ini: ${passed.length}`);

  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkStatus();
