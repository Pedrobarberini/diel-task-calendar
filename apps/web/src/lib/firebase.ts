import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Public Web identifiers, not server credentials. Access is enforced by firestore.rules.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBwo_8PVhGmV8h48qrCB-LosT1Ncdsm5Lc',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'diel-task-calendar-e704c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'diel-task-calendar-e704c',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:775315865152:web:5dee2095746af49bc4a9a5',
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Default memory cache avoids keeping calendar documents on a shared device after logout.
export const db = getFirestore(app);
