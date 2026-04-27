import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDI4Yi0lJsaBq_mTpj8N3-32QfEaDz1100",
  authDomain: "pdamseruyan23.firebaseapp.com",
  projectId: "pdamseruyan23",
  storageBucket: "pdamseruyan23.firebasestorage.app",
  messagingSenderId: "476401203521",
  appId: "1:476401203521:web:db8ed451711098e62889c0",
  measurementId: "G-1KHMMZ5ZTZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAndUpdateUser() {
  try {
    const q = query(collection(db, 'user'), where('email', '==', 'fanntek71@gmail.com'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No user found in Firestore with email fanntek71@gmail.com. We need their correct password to login and get UID, or delete the account in Firebase Auth to recreate it.');
      process.exit(1);
    }
    
    querySnapshot.forEach(async (docSnapshot) => {
      console.log('Found user with UID:', docSnapshot.id);
      await updateDoc(docSnapshot.ref, {
        name: 'kingnasir',
        phone: '0873743282482',
        address: 'jalan batu berlian',
        password: '12345678', // updating their password document but NOT their real Auth password
        role: 'direktur',
        status: 'active',
        avatar: 'https://ui-avatars.com/api/?name=kingnasir&background=random'
      });
      console.log('User document updated to direktur successfully!');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error querying firestore:', err);
    process.exit(1);
  }
}

findAndUpdateUser();
