import { useState, useEffect, useRef } from "react";
import { useBet } from "../../context/BetContext";
import { useAuth, ADMIN_EMAILS } from "../../context/AuthContext";
import { sounds } from "../../utils/sound";
import MusicPlayer from "./MusicPlayer";

export default function Navbar({ activeTab, setActiveTab, onOpenShareModal }) {
  const {
    currentRound,
    bets,
    syncWithNflWeek,
    isSyncingNflWeek,
    totalPot,
    liveGamesCount,
    pendingFinishedBets,
    pendingFinishedCount = 0,
    isCloudEnabled,
    cloudSyncStatus,
  } = useBet();
  const { user, userProfile, isAdmin, isModerator, role, isAuthenticated, logout, setShowLoginModal } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.muted);
  const menuRef = useRef(null);

  const isMaster = Boolean(
    user?.email && ADMIN_EMAILS?.includes(user.email.toLowerCase())
  );

  const getRoleInfo = () => {
    if (isMaster) {
      return {
        label: "👑 Comissário",
        badge: "👑 Comissário Master",
        badgeClass: "bg-yellow-400 text-gray-950 font-black shadow-sm",
        textColor: "text-yellow-400",
      };
    }
    if (isAdmin) {
      return {
        label: "👑 Comissário",
        badge: "👑 Comissário (Admin)",
        badgeClass: "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30",
        textColor: "text-yellow-400",
      };
    }
    if (isModerator || role === "moderator") {
      return {
        label: "⭐ Moderador",
        badge: "⭐ Moderador",
        badgeClass: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
        textColor: "text-purple-400",
      };
    }
    if (role === "viewer") {
      return {
        label: "👀 Convidado",
        badge: "👀 Convidado (Leitura)",
        badgeClass: "bg-gray-800 text-gray-300 border border-gray-700",
        textColor: "text-gray-400",
      };
    }
    if (role === "blocked") {
      return {
        label: "🚫 Bloqueado",
        badge: "🚫 Acesso Suspenso",
        badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
        textColor: "text-red-400",
      };
    }
    return {
      label: "🏈 Apostador",
      badge: "🏈 Apostador",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      textColor: "text-emerald-400",
    };
  };

  const roleInfo = getRoleInfo();

  // Fecha o menu de perfil ao clicar fora
  useEffect(() => {
    if (!showUserMenu) return;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showUserMenu]);

  const navTabs = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "games",     label: "Jogos NFL", icon: "🏈" },
    { id: "stats",     label: "Stats",     icon: "📊" },
    { id: "new-bet",   label: "Nova Aposta", icon: "➕" },
    { id: "history",   label: "Histórico",  icon: "📋" },
    { id: "achievements", label: "Conquistas", icon: "🏅" },
    ...(isAdmin
      ? [{ id: "settings", label: "Config", icon: "⚙️" }]
      : [{ id: "profile", label: "Perfil", icon: "👤" }]),
  ];

  const toggleSound = () => {
    sounds.muted = !sounds.muted;
    setIsMuted(sounds.muted);
    if (!sounds.muted) {
      sounds.playCash();
    }
  };

  return (
    <>
      {/* Top bar (Header Glassmorphism Full Width) */}
      <header className="bg-gray-950/85 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 transition-all">
        <div className="w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          {/* Brand / Logo + NFL Round */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-3 text-left group flex-shrink-0"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-500 flex items-center justify-center text-xl shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                🏈
              </div>
              <div className="hidden sm:block">
                <span className="text-white font-black tracking-tight text-base sm:text-lg block leading-tight group-hover:text-yellow-400 transition-colors">
                  NFL Bets da Resenha
                </span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block leading-tight flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Bolão Oficial
                </span>
              </div>
            </button>

            {/* NFL Round sync badge */}
            <button
              type="button"
              onClick={() => syncWithNflWeek()}
              disabled={isSyncingNflWeek}
              title="Sincronizar rodada com a semana atual da NFL (ESPN)"
              className="h-11 px-3.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs sm:text-sm font-black rounded-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <span className={isSyncingNflWeek ? "animate-spin inline-block text-sm" : "text-sm"}>
                {isSyncingNflWeek ? "⏳" : "🏈"}
              </span>
              <span>Semana #{currentRound}</span>
            </button>

            {/* Cloud Status Badge */}
            <button
              type="button"
              onClick={() => setActiveTab(isAdmin ? "settings" : "profile")}
              title={
                isCloudEnabled
                  ? cloudSyncStatus === "saving"
                    ? "Salvando na nuvem..."
                    : "Conectado ao Firebase Firestore (Tempo Real)"
                  : "Modo Local (Offline)."
              }
              className={`h-11 px-3 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
                isCloudEnabled
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-yellow-400 border-gray-800"
              }`}
            >
              {isCloudEnabled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden md:inline">
                    {cloudSyncStatus === "saving" ? "Salvando..." : "Nuvem"}
                  </span>
                </>
              ) : (
                <>
                  <span>☁️</span>
                  <span className="hidden md:inline">Local</span>
                </>
              )}
            </button>
          </div>

          {/* Center: Live games indicator pulse */}
          {liveGamesCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("games")}
              className="h-11 px-4 rounded-xl bg-red-600/20 border border-red-500/50 text-red-400 hover:text-white text-xs sm:text-sm font-black flex items-center gap-2 hover:bg-red-600/30 transition-all shadow-md shadow-red-600/20 animate-pulse flex-shrink-0"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span>{liveGamesCount} Ao Vivo</span>
            </button>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Total League Pot Card */}
            <div
              onClick={() => setActiveTab("dashboard")}
              title="Ver detalhes no Painel Principal"
              className="h-11 px-4 cursor-pointer flex flex-col items-center justify-center text-center bg-gradient-to-br from-gray-900/90 to-gray-950/90 border border-yellow-400/30 hover:border-yellow-400/60 rounded-xl shadow-inner transition-all hover:scale-105"
            >
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-400 font-extrabold leading-none block">
                Pote Geral
              </span>
              <span className="text-yellow-400 font-black text-sm sm:text-base leading-none mt-1 block">
                R$ {totalPot.toFixed(2)}
              </span>
            </div>

            {/* Quick Share Card button */}
            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                title="Compartilhar Card de Resenha da Rodada"
                className="h-11 hidden sm:flex items-center justify-center gap-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-gray-950 font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-500/10 transition-all hover:scale-105"
              >
                <span className="text-base">📸</span>
                <span className="hidden md:inline">Resenha</span>
              </button>
            )}

            {/* Quick New Bet button (Desktop) */}
            <button
              type="button"
              onClick={() => setActiveTab("new-bet")}
              title="Registrar Nova Aposta"
              className="h-11 hidden lg:flex items-center justify-center gap-2 px-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs sm:text-sm rounded-xl shadow transition-all hover:scale-105"
            >
              <span className="text-base">➕</span>
              <span>Apostar</span>
            </button>

            {/* Music Player: Pagode da Resenha */}
            <MusicPlayer />

            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              title={isMuted ? "Ativar efeitos sonoros" : "Desativar efeitos sonoros"}
              className="w-11 h-11 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>

            {/* Admin Quick Link */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                title="Painel de Usuários e Permissões"
                className={`h-11 hidden md:flex items-center justify-center gap-1.5 px-3.5 rounded-xl border text-xs font-black transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
                  activeTab === "users"
                    ? "bg-yellow-400 text-gray-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                    : "bg-gray-900/90 hover:bg-gray-800 text-yellow-400 border-yellow-400/30"
                }`}
              >
                <span>👥</span>
                <span>Usuários</span>
              </button>
            )}

            {/* Quick Stats Link */}
            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              title="Estatísticas e Raio-X dos Times"
              className={`h-11 hidden md:flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-black transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
                activeTab === "stats"
                  ? "bg-yellow-400 text-gray-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                  : "bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-800"
              }`}
            >
              <span>📊</span>
              <span className="hidden xl:inline">Stats</span>
            </button>

            {/* Quick Rules Link */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              title="Regras Oficiais do Bolão"
              className={`h-11 hidden md:flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-black transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
                activeTab === "rules"
                  ? "bg-yellow-400 text-gray-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                  : "bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-800"
              }`}
            >
              <span>📜</span>
              <span className="hidden xl:inline">Regras</span>
            </button>

            {/* Auth Profile / Login Button */}
            {isAuthenticated ? (
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title={`Conectado como ${userProfile?.displayName || user?.email}`}
                  className="h-11 px-3 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                >
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-gray-950 font-black text-xs flex items-center justify-center flex-shrink-0">
                      {(userProfile?.displayName || user?.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:flex flex-col text-left leading-none">
                    <span className="text-white font-bold text-xs max-w-[100px] truncate">
                      {userProfile?.displayName || user?.email?.split("@")[0]}
                    </span>
                    <span className={`text-[9px] ${roleInfo.textColor} font-extrabold uppercase mt-0.5`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <span className="text-gray-400 text-[10px]">▼</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-gray-800">
                      <p className="text-white text-xs font-black truncate">
                        {userProfile?.displayName || "Apostador"}
                      </p>
                      <p className="text-gray-400 text-[10px] truncate mt-0.5">{user?.email}</p>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${roleInfo.badgeClass}`}>
                        {roleInfo.badge}
                      </span>
                    </div>

                    {/* Meu Perfil */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab("profile");
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-white hover:bg-gray-800 font-bold flex items-center gap-2 transition-colors border-b border-gray-800/80"
                    >
                      <span>👤</span>
                      <span>Meu Perfil & Liga</span>
                    </button>

                    {/* Estatísticas & Confrontos */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab("stats");
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-sky-400 hover:bg-sky-400/10 font-bold flex items-center gap-2 transition-colors border-b border-gray-800/80"
                    >
                      <span>📊</span>
                      <span>Stats & Confrontos</span>
                    </button>

                    {/* Regras Oficiais */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setActiveTab("rules");
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-yellow-400 hover:bg-yellow-400/10 font-bold flex items-center gap-2 transition-colors border-b border-gray-800/80"
                    >
                      <span>📜</span>
                      <span>Regras & Permissões</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setActiveTab("users");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-yellow-400 hover:bg-yellow-400/10 font-bold flex items-center gap-2 transition-colors border-b border-gray-800/80"
                      >
                        <span>👥</span>
                        <span>Gerenciar Usuários</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setActiveTab("settings");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-gray-300 hover:bg-gray-800 font-bold flex items-center gap-2 transition-colors border-b border-gray-800/80"
                      >
                        <span>⚙️</span>
                        <span>Configurações do Bolão</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-950/30 font-bold flex items-center gap-2 transition-colors mt-1"
                    >
                      <span>🚪</span>
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="h-11 px-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-yellow-400/20 hover:scale-105 active:scale-95 flex-shrink-0"
              >
                <span>🔑</span>
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* AVISO DE APOSTAS PENDENTES DE JOGOS JÁ ENCERRADOS */}
        {pendingFinishedCount > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-amber-950/90 border-t border-b border-yellow-500/40 px-4 sm:px-8 py-2.5 shadow-lg">
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg flex-shrink-0 animate-bounce">⚠️</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <span>Jogos Encerrados</span>
                    <span className="bg-yellow-400 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {pendingFinishedCount}
                    </span>
                    <span className="text-[10px] text-yellow-400/80 font-semibold lowercase">
                      (aguardando resultado)
                    </span>
                  </p>
                  <p className="text-[11px] text-yellow-200/90 truncate">
                    {pendingFinishedCount === 1
                      ? "1 aposta possui jogo já encerrado aguardando resolução de Green/Red para atualizar os potes."
                      : `${pendingFinishedCount} apostas possuem jogos já encerrados aguardando resolução de Green/Red para atualizar os potes.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("games")}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs px-3.5 py-1.5 rounded-xl shadow transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Resolver nos Jogos</span>
                  <span>➜</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 z-40 h-16">
        <div className="max-w-2xl mx-auto flex h-full items-center">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center h-full py-1 gap-0.5 sm:gap-1 transition-colors
                ${activeTab === tab.id
                  ? "text-yellow-400"
                  : "text-gray-600 hover:text-gray-400"
                }`}
            >
              {tab.id === "games" && pendingFinishedCount > 0 && (
                <span className="absolute top-2 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              )}
              <span className="text-base sm:text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold leading-none truncate max-w-[52px] sm:max-w-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
