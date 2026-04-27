import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

async function createOrUpdateAccount() {
  let user;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'fanntek71@gmail.com', '12345678');
    user = userCredential.user;
    console.log('Account created in Auth!');
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Account already exists in Auth, signing in to update Firestore...');
      const userCredential = await signInWithEmailAndPassword(auth, 'fanntek71@gmail.com', '12345678');
      user = userCredential.user;
    } else {
      console.error('Error creating account:', error);
      process.exit(1);
    }
  }

  try {
    await setDoc(doc(db, 'user', user.uid), {
      id: user.uid,
      name: 'kingnasir',
      email: 'fanntek71@gmail.com',
      phone: '0873743282482',
      address: 'jalan batu berlian',
      password: '12345678',
      role: 'direktur',
      status: 'active',
      avatar: 'https://ui-avatars.com/api/?name=kingnasir&background=random'
    });
    console.log('Firestore document updated successfully! Account is ready.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating firestore:', err);
    process.exit(1);
  }
}

createOrUpdateAccount();
