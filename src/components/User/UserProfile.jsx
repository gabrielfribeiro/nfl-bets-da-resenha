import { useAuth, ADMIN_EMAILS } from "../../context/AuthContext";
import { useBet } from "../../context/BetContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";

export default function UserProfile({ onOpenTab }) {
  const { user, userProfile, role, isAdmin, isModerator, isMember, isViewer, isBlocked, logout } = useAuth();
  const { leagueId, currentRound, teams, bets, selectedTeamIds, totalPot, isCloudEnabled, cloudSyncStatus } = useBet();

  const isMaster = ADMIN_EMAILS.includes(user?.email?.toLowerCase());

  // Dados do time vinculado
  const assignedTeamId = userProfile?.teamId;
  const assignedTeam = assignedTeamId ? getTeamById(assignedTeamId) : null;
  const teamData = assignedTeamId ? teams[assignedTeamId] : null;

  // Apostas envolvendo o time do usuário
  const userTeamBets = assignedTeamId
    ? bets.filter((b) => b.bettingOnTeamId === assignedTeamId)
    : [];
  const teamWins = userTeamBets.filter((b) => b.result === "win").length;
  const teamLosses = userTeamBets.filter((b) => b.result === "loss").length;
  const teamPending = userTeamBets.filter((b) => b.result === "pending").length;
  const finishedCount = teamWins + teamLosses;
  const teamWinRate = finishedCount > 0 ? Math.round((teamWins / finishedCount) * 100) : 0;

  // Badge da Role
  const renderRoleBadge = () => {
    if (isMaster) {
      return (
        <span className="px-3 py-1 rounded-xl text-xs font-black bg-yellow-400 text-gray-950 shadow-md">
          👑 Comissário Master
        </span>
      );
    }
    if (isAdmin) {
      return (
        <span className="px-3 py-1 rounded-xl text-xs font-black bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
          👑 Comissário (Admin)
        </span>
      );
    }
    if (isModerator) {
      return (
        <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
          ⭐ Moderador
        </span>
      );
    }
    if (isBlocked) {
      return (
        <span className="px-3 py-1 rounded-xl text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30">
          🚫 Acesso Suspenso
        </span>
      );
    }
    if (isViewer) {
      return (
        <span className="px-3 py-1 rounded-xl text-xs font-black bg-gray-800 text-gray-300 border border-gray-700">
          👀 Convidado (Modo Leitura)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        🏈 Apostador Oficial
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2.5">
            <span>👤</span>
            <span>Meu Perfil</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Veja seu papel no bolão, detalhes da sua liga e estatísticas do seu time.
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🚪</span>
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Card 1: Dados do Usuário */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-cover border-2 border-yellow-400/30 shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-500 text-gray-950 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                {(userProfile?.displayName || user?.email || "U")[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-white font-black text-lg sm:text-2xl truncate">
                  {userProfile?.displayName || user?.email?.split("@")[0]}
                </h3>
                {renderRoleBadge()}
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">{user?.email}</p>
              {userProfile?.createdAt && (
                <p className="text-gray-500 text-xs mt-1">
                  Membro desde {new Date(userProfile.createdAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          {/* Quick Admin Navigation Shortcuts */}
          {isAdmin && onOpenTab && (
            <div className="flex sm:flex-col gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800">
              <button
                type="button"
                onClick={() => onOpenTab("users")}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black transition-all flex items-center justify-center gap-2"
              >
                <span>👥</span>
                <span>Painel de Usuários</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenTab("settings")}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>⚙️</span>
                <span>Configurações</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Card da Liga & Card do Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 2: Liga Atual */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏆</span>
              <div>
                <h4 className="text-white font-black text-base">Liga da Resenha 2026</h4>
                <p className="text-gray-500 text-xs">Identificador: <code className="text-yellow-400 font-mono">{leagueId || "resenha-2026"}</code></p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 ${
              isCloudEnabled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-gray-800 text-gray-400 border-gray-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isCloudEnabled ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`}></span>
              <span>{isCloudEnabled ? "Nuvem Ativa" : "Modo Local"}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-gray-400 block font-semibold">Semana Atual NFL</span>
              <span className="text-yellow-400 font-black text-xl block mt-1">
                Semana #{currentRound}
              </span>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-gray-400 block font-semibold">Pote Geral da Liga</span>
              <span className="text-emerald-400 font-black text-xl block mt-1">
                R$ {totalPot.toFixed(2)}
              </span>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-gray-400 block font-semibold">Times Selecionados</span>
              <span className="text-white font-black text-xl block mt-1">
                {selectedTeamIds.length} <span className="text-gray-500 text-xs font-normal">/ 16</span>
              </span>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-gray-400 block font-semibold">Apostas da Temporada</span>
              <span className="text-white font-black text-xl block mt-1">
                {bets.length}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Time Vinculado */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏈</span>
                <h4 className="text-white font-black text-base">Seu Time na Liga</h4>
              </div>
              <span className="text-xs text-gray-400 font-bold">
                {assignedTeam ? "Time Oficial" : "Pendente"}
              </span>
            </div>

            {assignedTeam ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-gray-950/80 border border-gray-800 rounded-2xl p-4">
                  <img
                    src={getLogoUrl(assignedTeam)}
                    alt=""
                    className="w-14 h-14 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="min-w-0">
                    <h5 className="text-white font-black text-lg leading-tight truncate">
                      {assignedTeam.name}
                    </h5>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {assignedTeam.conference} • {assignedTeam.division}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                      ID: {assignedTeam.id.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-950/70 border border-emerald-500/20 rounded-2xl p-3.5">
                    <span className="text-[11px] text-emerald-400 block font-semibold">Pote Atual do Time</span>
                    <span className="text-emerald-400 font-black text-xl block mt-1">
                      R$ {(teamData?.pot ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
                    <span className="text-[11px] text-gray-400 block font-semibold">Aproveitamento</span>
                    <span className="text-white font-black text-xl block mt-1">
                      {teamWins}V - {teamLosses}D
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 text-2xl flex items-center justify-center mx-auto text-gray-400">
                  🏈
                </div>
                <p className="text-white font-bold text-sm">Nenhum time vinculado</p>
                <p className="text-gray-500 text-xs max-w-xs mx-auto">
                  {isAdmin
                    ? "Você pode vincular seu time ou de outros participantes na tela de Gestão de Usuários."
                    : "O Comissário da liga pode associar um dos 16 times oficiais ao seu perfil no painel de gestão."}
                </p>
              </div>
            )}
          </div>

          {assignedTeam && onOpenTab && (
            <button
              type="button"
              onClick={() => onOpenTab("new-bet")}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Fazer Aposta com {assignedTeam.name}</span>
              <span>➕</span>
            </button>
          )}
        </div>
      </div>

      {/* Card 4: Histórico de Desempenho Pessoal */}
      {assignedTeam && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h4 className="text-white font-black text-base">Estatísticas do Seu Time no Bolão</h4>
            </div>
            <span className="text-xs text-yellow-400 font-bold">{userTeamBets.length} apostas feitas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
              <span className="text-xs text-gray-400 font-semibold block">Total de Apostas</span>
              <span className="text-white font-black text-2xl block mt-1">{userTeamBets.length}</span>
            </div>

            <div className="bg-gray-950/70 border border-emerald-500/20 rounded-2xl p-4">
              <span className="text-xs text-emerald-400 font-semibold block">Vitórias (Green)</span>
              <span className="text-emerald-400 font-black text-2xl block mt-1">{teamWins}</span>
            </div>

            <div className="bg-gray-950/70 border border-red-500/20 rounded-2xl p-4">
              <span className="text-xs text-red-400 font-semibold block">Derrotas (Red)</span>
              <span className="text-red-400 font-black text-2xl block mt-1">{teamLosses}</span>
            </div>

            <div className="bg-gray-950/70 border border-yellow-500/20 rounded-2xl p-4">
              <span className="text-xs text-yellow-400 font-semibold block">Taxa de Acerto</span>
              <span className="text-yellow-400 font-black text-2xl block mt-1">{teamWinRate}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
