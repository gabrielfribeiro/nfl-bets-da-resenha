import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthChange,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  logoutUser,
  getUserProfile,
  saveUserProfile,
  isFirebaseConfigured,
} from "../services/firebase";

export const AuthContext = createContext(null);

export const ADMIN_EMAILS = ["gabrielfribeiro44@gmail.com"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Escuta mudanças de sessão de usuário no Firebase Auth
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          const isDefaultAdmin = ADMIN_EMAILS.includes(
            firebaseUser.email?.toLowerCase()
          );

          if (!profile) {
            // Se o perfil não existir ainda no Firestore, cria automaticamente
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName:
                firebaseUser.displayName ||
                firebaseUser.email.split("@")[0],
              photoURL: firebaseUser.photoURL || null,
              role: isDefaultAdmin ? "admin" : "viewer",
              createdAt: new Date().toISOString(),
            };
            await saveUserProfile(firebaseUser.uid, profile);
          } else {
            // Atualiza foto ou displayName caso tenham mudado
            let needsUpdate = false;
            const updatePayload = {};

            if (isDefaultAdmin && profile.role !== "admin") {
              profile.role = "admin";
              updatePayload.role = "admin";
              needsUpdate = true;
            }
            if (firebaseUser.photoURL && profile.photoURL !== firebaseUser.photoURL) {
              profile.photoURL = firebaseUser.photoURL;
              updatePayload.photoURL = firebaseUser.photoURL;
              needsUpdate = true;
            }
            if (needsUpdate) {
              await saveUserProfile(firebaseUser.uid, updatePayload);
            }
          }
          setUserProfile(profile);
        } catch (err) {
          console.error("[Auth] Erro ao carregar perfil do usuário:", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const cred = await loginWithEmail(email, password);
      setShowLoginModal(false);
      return cred.user;
    } catch (err) {
      let friendlyMessage = "Falha ao entrar. Verifique seus dados.";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        friendlyMessage = "E-mail ou senha incorretos.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Formato de e-mail inválido.";
      } else if (err.code === "auth/too-many-requests") {
        friendlyMessage =
          "Muitas tentativas sem sucesso. Aguarde alguns instantes.";
      }
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  }, []);

  const loginGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await loginWithGoogle();
      setShowLoginModal(false);
      return cred.user;
    } catch (err) {
      let friendlyMessage = "Falha ao autenticar com o Google.";
      if (err.code === "auth/popup-closed-by-user") {
        friendlyMessage = "Login cancelado. O popup foi fechado antes de concluir.";
      } else if (err.code === "auth/cancelled-popup-request") {
        friendlyMessage = "Operação cancelada.";
      } else if (err.code === "auth/popup-blocked") {
        friendlyMessage = "Popup bloqueado pelo navegador. Permita popups para este site.";
      } else if (err.code === "auth/unauthorized-domain") {
        friendlyMessage = "Domínio não autorizado no Firebase Console. Adicione seu domínio em Firebase > Authentication > Settings > Authorized Domains.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    setAuthError(null);
    try {
      const cred = await registerWithEmail(email, password, displayName);
      const isDefaultAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      const newProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || email.split("@")[0],
        photoURL: cred.user.photoURL || null,
        role: isDefaultAdmin ? "admin" : "viewer",
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(cred.user.uid, newProfile);
      setUserProfile(newProfile);
      setShowLoginModal(false);
      return cred.user;
    } catch (err) {
      let friendlyMessage = "Falha ao criar conta.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "Este e-mail já está cadastrado.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Formato de e-mail inválido.";
      }
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setUserProfile(null);
  }, []);

  // Determinação de papéis
  const isDefaultAdmin = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  );
  const rawRole = userProfile?.role || (isDefaultAdmin ? "admin" : "viewer");
  const isBlocked = !isDefaultAdmin && rawRole === "blocked";
  const role = isBlocked ? "blocked" : (isDefaultAdmin ? "admin" : rawRole);

  const isAdmin = !isBlocked && (role === "admin" || role === "comissario" || isDefaultAdmin);
  const isModerator = !isBlocked && (isAdmin || role === "moderator" || role === "moderador");
  const isMember = !isBlocked && (isAdmin || isModerator || role === "member" || role === "apostador");
  const isViewer = role === "viewer" || role === "convidado";

  // Permissões específicas de funcionalidades
  const canConfigureLeague = isAdmin;
  const canManageBets = isAdmin || isModerator;
  const canPlaceBets = isMember && !isBlocked;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        setUserProfile,
        role,
        isAdmin,
        isModerator,
        isMember,
        isViewer,
        isBlocked,
        canConfigureLeague,
        canManageBets,
        canPlaceBets,
        isAuthenticated,
        loading,
        showLoginModal,
        setShowLoginModal,
        authError,
        setAuthError,
        login,
        loginGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser utilizado dentro de AuthProvider");
  return ctx;
}
