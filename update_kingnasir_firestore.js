import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

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

async function findAndUpdateUser() {
  try {
    const q = query(collection(db, 'user_admin'), where('email', '==', 'fanntek71@gmail.com'));
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
