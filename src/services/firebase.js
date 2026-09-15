import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
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

// ── FIRESTORE LEAGUE SYNC (ARQUITETURA MODULAR POR LIGA) ─────────────

/**
 * 1. Inscreve-se para atualizações em tempo real do documento de configuração e potes da liga:
 *    caminho: `leagues/{leagueId}`
 */
export function subscribeToLeagueConfig(leagueId, onData, onError) {
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
        onData(null);
      }
    },
    (err) => {
      console.warn("[Firebase] Erro ao sincronizar configurações da liga:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * 2. Inscreve-se para atualizações em tempo real da subcoleção de apostas da liga:
 *    caminho: `leagues/{leagueId}/bets`
 */
export function subscribeToLeagueBets(leagueId, onData, onError) {
  if (!db) {
    onData([]);
    return () => {};
  }

  const betsColRef = collection(db, "leagues", leagueId || DEFAULT_LEAGUE_ID, "bets");

  return onSnapshot(
    betsColRef,
    (snapshot) => {
      const betsList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Ordena por data decrescente (mais recentes primeiro)
      betsList.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onData(betsList);
    },
    (err) => {
      console.warn("[Firebase] Erro ao sincronizar histórico de apostas:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * 3. Salva ou atualiza as configurações e potes da liga:
 *    caminho: `leagues/{leagueId}` (sem incluir o array bets)
 */
export async function saveLeagueConfig(leagueId, data, merge = true) {
  if (!db) {
    return false;
  }

  try {
    const leagueDocRef = doc(db, "leagues", leagueId || DEFAULT_LEAGUE_ID);
    // Remove o array bets se presente, pois as apostas residem na subcoleção 'bets'
    const { bets, ...configData } = data || {};

    await setDoc(
      leagueDocRef,
      {
        ...configData,
        updatedAt: new Date().toISOString(),
      },
      { merge }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Erro ao salvar configurações da liga no Firestore:", err);
    throw err;
  }
}

/**
 * 4. Salva ou atualiza um documento de aposta individual:
 *    caminho: `leagues/{leagueId}/bets/{betId}`
 */
export async function saveBetDoc(leagueId, bet) {
  if (!db || !bet || !bet.id) {
    return false;
  }

  try {
    const betDocRef = doc(db, "leagues", leagueId || DEFAULT_LEAGUE_ID, "bets", bet.id);
    await setDoc(
      betDocRef,
      {
        ...bet,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error(`[Firebase] Erro ao salvar aposta ${bet.id}:`, err);
    throw err;
  }
}

/**
 * 5. Exclui um documento de aposta individual:
 *    caminho: `leagues/{leagueId}/bets/{betId}`
 */
export async function deleteBetDoc(leagueId, betId) {
  if (!db || !betId) {
    return false;
  }

  try {
    const betDocRef = doc(db, "leagues", leagueId || DEFAULT_LEAGUE_ID, "bets", betId);
    await deleteDoc(betDocRef);
    return true;
  } catch (err) {
    console.error(`[Firebase] Erro ao deletar aposta ${betId}:`, err);
    throw err;
  }
}

/**
 * 6. Migração transparente de apostas legadas (do array do documento principal para a subcoleção):
 */
export async function migrateLegacyBets(leagueId, legacyBets) {
  if (!db || !Array.isArray(legacyBets) || legacyBets.length === 0) {
    return 0;
  }

  const activeLeagueId = leagueId || DEFAULT_LEAGUE_ID;
  console.log(`[Firebase Migration] Iniciando migração de ${legacyBets.length} apostas para subcoleção bets...`);

  try {
    const batch = writeBatch(db);

    legacyBets.forEach((bet) => {
      if (bet && bet.id) {
        const betRef = doc(db, "leagues", activeLeagueId, "bets", bet.id);
        batch.set(betRef, {
          ...bet,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    });

    // Limpa o array legado do documento principal para não duplicar no futuro
    const leagueDocRef = doc(db, "leagues", activeLeagueId);
    batch.set(leagueDocRef, { bets: [] }, { merge: true });

    await batch.commit();
    console.log(`[Firebase Migration] ${legacyBets.length} apostas migradas com sucesso!`);
    return legacyBets.length;
  } catch (err) {
    console.error("[Firebase Migration] Erro durante a migração de apostas:", err);
    return 0;
  }
}

/**
 * 7. Limpa todas as apostas da subcoleção (usado no reset do comissário):
 */
export async function deleteAllBets(leagueId) {
  if (!db) return;
  try {
    const activeLeagueId = leagueId || DEFAULT_LEAGUE_ID;
    const betsColRef = collection(db, "leagues", activeLeagueId, "bets");
    const snapshot = await getDocs(betsColRef);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    console.log(`[Firebase] Subcoleção de apostas limpa com sucesso.`);
  } catch (err) {
    console.error("[Firebase] Erro ao limpar subcoleção de apostas:", err);
  }
}

/**
 * Compatibilidade legada para referências antigas:
 */
export const subscribeToLeague = subscribeToLeagueConfig;
export const saveLeagueData = saveLeagueConfig;



