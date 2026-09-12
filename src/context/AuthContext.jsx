import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthChange,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  getUserProfile,
  saveUserProfile,
  isFirebaseConfigured,
} from "../services/firebase";

const AuthContext = createContext(null);

const ADMIN_EMAILS = ["gabrielfribeiro44@gmail.com"];

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
              role: isDefaultAdmin ? "admin" : "member",
              createdAt: new Date().toISOString(),
            };
            await saveUserProfile(firebaseUser.uid, profile);
          } else if (isDefaultAdmin && profile.role !== "admin") {
            // Garante que o comissário sempre tenha role admin
            profile.role = "admin";
            await saveUserProfile(firebaseUser.uid, profile);
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

  const register = useCallback(async (email, password, displayName) => {
    setAuthError(null);
    try {
      const cred = await registerWithEmail(email, password, displayName);
      const isDefaultAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      const newProfile = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || email.split("@")[0],
        role: isDefaultAdmin ? "admin" : "member",
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
  const role = userProfile?.role || (isDefaultAdmin ? "admin" : "viewer");
  const isAdmin = role === "admin" || isDefaultAdmin;
  const isMember = isAdmin || role === "member";
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAdmin,
        isMember,
        isAuthenticated,
        loading,
        showLoginModal,
        setShowLoginModal,
        authError,
        setAuthError,
        login,
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
