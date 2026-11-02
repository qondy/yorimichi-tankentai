import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// NOTE: Firebase の Web 設定は秘匿情報ではなく、実質的な防御は firestore.rules 側で行う。
// （他のミニアプリと同様に、この値はコミットして良い）
const firebaseConfig = {
  apiKey: 'AIzaSyCr0CoeI_ccSDQl72PD-CQJ7zKq0ccYaRI',
  authDomain: 'yorimichi-tankentai.firebaseapp.com',
  projectId: 'yorimichi-tankentai',
  storageBucket: 'yorimichi-tankentai.firebasestorage.app',
  messagingSenderId: '729573615325',
  appId: '1:729573615325:web:c0ed4c8271c633fd84dd34',
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
