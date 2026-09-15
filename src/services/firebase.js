import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, onSnapshot, setDoc } from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDrJF5HH-8-wwOCNdwDDo0-PHSJDkBantA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nfl-bets-da-resenha.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nfl-bets-da-resenha",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nfl-bets-da-resenha.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1014505973765",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1014505973765:web:6db9becbeb82d6db48546c",
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
let auth = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    console.error("[Firebase] Falha ao inicializar o Firebase:", err);
  }
}

export { app, db, auth };

// ── AUTHENTICATION HELPERS ──────────────────────────────────────────

export async function loginWithEmail(email, password) {
  if (!auth) throw new Error("Firebase Auth não está configurado.");
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function loginWithGoogle() {
  if (!auth) throw new Error("Firebase Auth não está configurado.");
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function registerWithEmail(email, password, displayName) {
  if (!auth) throw new Error("Firebase Auth não está configurado.");
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
}

export async function logoutUser() {
  if (!auth) return;
  return await signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ── USER PROFILE & ROLES (FIRESTORE) ───────────────────────────────

export async function getUserProfile(uid) {
  if (!db || !uid) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (err) {
    console.warn("[Firebase] Erro ao buscar perfil do usuário:", err);
    return null;
  }
}

export async function saveUserProfile(uid, profileData) {
  if (!db || !uid) return false;
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ...profileData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Erro ao salvar perfil do usuário:", err);
    return false;
  }
}

/**
 * Inscreve-se em tempo real para a coleção de usuários cadastrados
 */
export function subscribeToUsers(onData, onError) {
  if (!db) {
    onData([]);
    return () => {};
  }

  const usersCol = collection(db, "users");
  return onSnapshot(
    usersCol,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
      onData(users);
    },
    (err) => {
      console.warn("[Firebase] Erro ao sincronizar usuários:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Altera a role de um usuário (admin | member | blocked)
 */
export async function updateUserRole(uid, role) {
  return await saveUserProfile(uid, { role });
}

/**
 * Associa um time da liga a um usuário
 */
export async function updateUserTeam(uid, teamId) {
  return await saveUserProfile(uid, { teamId });
}

// ── FIRESTORE LEAGUE SYNC ───────────────────────────────────────────

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
export async function saveLeagueData(leagueId, data, merge = true) {
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
      { merge }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Erro ao salvar dados no Firestore:", err);
    throw err;
  }
}


