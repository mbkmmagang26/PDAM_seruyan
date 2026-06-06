import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, updateDoc, deleteField } from "firebase/firestore";

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

async function cleanPasswords() {
  console.log("Authenticating as admin/direktur...");
  try {
    // Sign in to gain read/write permissions under active session
    await signInWithEmailAndPassword(auth, 'fanntek71@gmail.com', '12345678');
    console.log("Authentication successful!");
  } catch (authErr) {
    console.error("Authentication failed:", authErr);
    process.exit(1);
  }

  console.log("Starting cleanup of password fields in 'user' collection...");
  try {
    const querySnapshot = await getDocs(collection(db, 'user'));
    let count = 0;
    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data();
      if (userData.password) {
        console.log(`Removing password field from user: ${userData.email} (${docSnapshot.id})`);
        await updateDoc(docSnapshot.ref, {
          password: deleteField()
        });
        count++;
      }
    }
    console.log(`Cleanup completed! Removed password field from ${count} user documents.`);
    process.exit(0);
  } catch (err) {
    console.error("Error cleaning up passwords:", err);
    process.exit(1);
  }
}

cleanPasswords();
