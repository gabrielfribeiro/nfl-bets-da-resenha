import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const DEFAULT_LEAGUE_ID =
  import.meta.env.VITE_FIREBASE_LEAGUE_ID || "resenha-2026";

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.apiKey.length > 5 &&
      !firebaseConfig.apiKey.includes("...")
  );
}

let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error("[Firebase] Falha ao inicializar o Firebase:", err);
  }
}

export { app, db };

/**
 * Inscreve-se para atualizações em tempo real do documento da liga no Firestore
 */
export function subscribeToLeague(leagueId, onData, onError) {
  if (!db) {
    return () => {};
  }

  const leagueDocRef = doc(db, "leagues", leagueId || DEFAULT_LEAGUE_ID);

  return onSnapshot(
    leagueDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      } else {
        // Documento ainda não existe na nuvem
        onData(null);
      }
    },
    (err) => {
      console.warn("[Firebase] Erro ao sincronizar liga:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Salva ou atualiza os dados da liga no Firestore
 */
export async function saveLeagueData(leagueId, data) {
  if (!db) {
    return false;
  }

  try {
    const leagueDocRef = doc(db, "leagues", leagueId || DEFAULT_LEAGUE_ID);
    await setDoc(
      leagueDocRef,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Erro ao salvar dados no Firestore:", err);
    throw err;
  }
}

