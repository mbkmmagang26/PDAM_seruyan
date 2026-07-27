const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

async function run() {
  try {
    const q = query(collection(db, 'tb_permohonan'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} documents in tb_permohonan`);
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data().name, doc.data().date);
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

run();
