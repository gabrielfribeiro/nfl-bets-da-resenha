import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, login, loginGoogle, register, authError, setAuthError } = useAuth();
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!showLoginModal) return null;

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginGoogle();
    } catch {
      // erro tratado no contexto
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch {
      // erro capturado no contexto
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-500 flex items-center justify-center text-xl shadow-md shadow-amber-500/20 flex-shrink-0">
              🏈
            </div>
            <div>
              <h3 className="text-white font-black text-lg leading-tight">NFL Bets da Resenha</h3>
              <p className="text-gray-400 text-xs font-semibold">
                {tab === "login" ? "Acesse sua conta para apostar" : "Crie sua conta para participar"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setShowLoginModal(false);
            }}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Google Sign-in Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isGoogleLoading ? (
              <span className="animate-spin text-base">⏳</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continuar com o Google</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">ou com e-mail</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>
        </div>

        {/* Tabs: Entrar / Cadastrar */}
        <div className="flex rounded-xl bg-gray-950 p-1 border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              tab === "login"
                ? "bg-yellow-400 text-gray-950 shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
              tab === "register"
                ? "bg-yellow-400 text-gray-950 shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs font-medium animate-in fade-in duration-150">
            <span className="text-base">⚠️</span>
            <span>{authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-gray-300 text-xs font-bold mb-1">
                Seu Nome ou Apelido da Resenha
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Gabriel Felipe"
                className="w-full py-2.5 px-3.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-400 placeholder:text-gray-600 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-xs font-bold mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@gmail.com"
              className="w-full py-2.5 px-3.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-400 placeholder:text-gray-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-xs font-bold mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pelo menos 6 dígitos"
              className="w-full py-2.5 px-3.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:outline-none focus:border-yellow-400 placeholder:text-gray-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-sm transition-all shadow-lg shadow-yellow-400/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Processando...</span>
              </>
            ) : tab === "login" ? (
              "Entrar no Bolão"
            ) : (
              "Criar Conta e Acessar"
            )}
          </button>
        </form>

        {/* Guest fallback button */}
        <div className="pt-2 border-t border-gray-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setShowLoginModal(false);
            }}
            className="text-xs text-gray-500 hover:text-gray-300 font-bold transition-colors"
          >
            Continuar como Visitante (Modo Leitura) →
          </button>
        </div>
      </div>
    </div>
  );
}
