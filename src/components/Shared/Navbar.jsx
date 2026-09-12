import { useState } from "react";
import { useBet } from "../../context/BetContext";
import { sounds } from "../../utils/sound";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "games",     label: "Jogos NFL", icon: "🏈" },
  { id: "new-bet",   label: "Nova Aposta", icon: "➕" },
  { id: "history",   label: "Histórico",  icon: "📋" },
  { id: "achievements", label: "Conquistas", icon: "🏅" },
  { id: "settings",  label: "Config",     icon: "⚙️" },
];

export default function Navbar({ activeTab, setActiveTab, onOpenShareModal }) {
  const { currentRound, bets, syncWithNflWeek, isSyncingNflWeek, totalPot, liveGamesCount } = useBet();
  const [isMuted, setIsMuted] = useState(sounds.muted);
  const pendingBets = bets.filter((b) => b.result === "pending");
  const pendingCount = pendingBets.length;

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

            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              title={isMuted ? "Ativar efeitos sonoros" : "Desativar efeitos sonoros"}
              className="w-11 h-11 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 flex items-center justify-center text-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        {/* AVISO DE APOSTAS PENDENTES NO HEADER */}
        {pendingCount > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-amber-950/90 border-t border-b border-yellow-500/40 px-4 sm:px-8 py-2.5 shadow-lg">
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg flex-shrink-0 animate-bounce">⚠️</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <span>Apostas Pendentes</span>
                    <span className="bg-yellow-400 text-gray-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {pendingCount}
                    </span>
                  </p>
                  <p className="text-[11px] text-yellow-200/80 truncate">
                    {pendingCount === 1
                      ? "Há 1 aposta aguardando resolução de Green/Red para atualizar os potes."
                      : `Há ${pendingCount} apostas aguardando resolução de Green/Red para atualizar os potes.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("games")}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs px-3 py-1 rounded-xl shadow transition-all hover:scale-105"
                >
                  Resolver nos Jogos ➜
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 z-40 h-16">
        <div className="max-w-lg mx-auto flex h-full items-center">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center h-full py-1 gap-1 transition-colors
                ${activeTab === tab.id
                  ? "text-yellow-400"
                  : "text-gray-600 hover:text-gray-400"
                }`}
            >
              {tab.id === "games" && pendingCount > 0 && (
                <span className="absolute top-2 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              )}
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
