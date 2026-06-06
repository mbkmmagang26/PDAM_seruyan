import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

const defaultUsers = [
  {
    email: "fanntek71@gmail.com",
    password: "12345678",
    name: "Direktur PDAM",
    phone: "081234567890",
    address: "Kantor Pusat PDAM Seruyan",
    role: "direktur",
    status: "active",
    avatar: "https://ui-avatars.com/api/?name=Direktur+PDAM&background=0D8ABC&color=fff"
  },
  {
    email: "admin@pdam.com",
    password: "12345678",
    name: "Admin PDAM",
    phone: "081234567891",
    address: "Kantor Pusat PDAM Seruyan",
    role: "admin",
    status: "active",
    avatar: "https://ui-avatars.com/api/?name=Admin+PDAM&background=FF5722&color=fff"
  },
  {
    email: "staff@pdam.com",
    password: "12345678",
    name: "Staff Lapangan PDAM",
    phone: "081234567892",
    address: "Kantor Pusat PDAM Seruyan",
    role: "staff",
    status: "active",
    avatar: "https://ui-avatars.com/api/?name=Staff+PDAM&background=4CAF50&color=fff"
  }
];

async function seed() {
  for (const userConfig of defaultUsers) {
    let uid = "";
    console.log(`Processing ${userConfig.role}: ${userConfig.email}...`);

    try {
      // 1. Coba daftarkan di Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userConfig.email, userConfig.password);
      uid = userCredential.user.uid;
      console.log(`-> Account created in Auth! UID: ${uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // 2. Jika sudah ada, login untuk mendapatkan UID
        console.log('-> Account already exists in Auth, signing in to retrieve UID...');
        const userCredential = await signInWithEmailAndPassword(auth, userConfig.email, userConfig.password);
        uid = userCredential.user.uid;
        console.log(`-> Signed in successfully! UID: ${uid}`);
      } else {
        console.error(`-> Error processing Auth for ${userConfig.email}:`, error);
        continue;
      }
    }

    try {
      await setDoc(doc(db, 'user_admin', uid), {
        id: uid,
        name: userConfig.name,
        email: userConfig.email,
        phone: userConfig.phone,
        address: userConfig.address,
        role: userConfig.role,
        status: userConfig.status,
        avatar: userConfig.avatar
      });
      console.log(`-> Firestore document updated for UID: ${uid}`);
    } catch (err) {
      console.error(`-> Error updating Firestore document for ${userConfig.email}:`, err);
    }
    console.log("-----------------------------------------");
  }
  console.log("Seeding completed!");
  process.exit(0);
}

seed();
