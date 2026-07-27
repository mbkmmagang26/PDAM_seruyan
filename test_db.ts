import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy_mock_api_key",
  authDomain: "pdam-seruyan-mock.firebaseapp.com",
  projectId: "pdam-seruyan-mock",
  storageBucket: "pdam-seruyan-mock.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// We don't have the actual firebaseConfig credentials. Wait! They are in src/firebase.ts!
