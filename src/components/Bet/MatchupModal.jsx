import { useState, useEffect } from "react";
import { NFL_TEAMS, getLogoUrl } from "../../data/nflTeams";
import { fetchNflScoreboard } from "../../services/espnApi";

const FILTER_TABS = [
  { id: "ESPN_GAMES", label: "🏈 Jogos da Rodada (ESPN)" },
  { id: "BOLAO", label: "★ Nossos 16 Times" },
  { id: "TODOS", label: "Todos os 32" },
  { id: "AFC", label: "AFC" },
  { id: "NFC", label: "NFC" },
];

export default function MatchupModal({
  isOpen,
  onClose,
  teamAId,
  teamBId,
  selectedTeamIds,
  onSelectMatchup,
}) {
  const [activeTab, setActiveTab] = useState("ESPN_GAMES");
  const [tempA, setTempA] = useState(teamAId);
  const [tempB, setTempB] = useState(teamBId);
  const [search, setSearch] = useState("");
  const [espnGames, setEspnGames] = useState([]);
  const [loadingEspn, setLoadingEspn] = useState(false);
  const [onlyLeagueGames, setOnlyLeagueGames] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setTempA(teamAId);
      setTempB(teamBId);
      setLoadingEspn(true);
      fetchNflScoreboard()
        .then((res) => {
          if (res.success) {
            setEspnGames(res.games);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEspn(false));
    }
  }, [isOpen, teamAId, teamBId]);

  if (!isOpen) return null;

  const filteredTeams = NFL_TEAMS.filter((t) => {
    let matchesTab = true;
    if (activeTab === "BOLAO") {
      matchesTab = selectedTeamIds.includes(t.id);
    } else if (activeTab === "AFC" || activeTab === "NFC") {
      matchesTab = t.conference === activeTab;
    }
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    const aSelected = selectedTeamIds.includes(a.id);
    const bSelected = selectedTeamIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.name.localeCompare(b.name);
  });

  const handlePickTeam = (id) => {
    // If already picked as tempA, unselect
    if (tempA === id) {
      setTempA("");
      return;
    }
    // If already picked as tempB, unselect
    if (tempB === id) {
      setTempB("");
      return;
    }

    // Fill tempA first, then tempB
    if (!tempA) {
      setTempA(id);
    } else if (!tempB) {
      setTempB(id);
    } else {
      // Both filled, replace tempB
      setTempB(id);
    }
  };

  const handleConfirm = () => {
    if (tempA && tempB) {
      onSelectMatchup(tempA, tempB);
      onClose();
    }
  };

  const teamAObj = NFL_TEAMS.find((t) => t.id === tempA);
  const teamBObj = NFL_TEAMS.find((t) => t.id === tempB);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-950/60">
          <div>
            <h3 className="text-white font-black text-xl flex items-center gap-2">
              <span>🏈</span>
              <span>Escolher Confronto do Jogo</span>
            </h3>
            <p className="text-gray-400 text-xs">
              Selecione 2 times para duelarem nesta aposta
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center font-bold text-base transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selected Matchup Preview Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 flex items-center justify-center gap-4 sm:gap-8 flex-shrink-0">
          {/* Team A */}
          <div className="flex items-center gap-3 min-w-[140px]">
            {teamAObj ? (
              <>
                <img
                  src={getLogoUrl(teamAObj, 150)}
                  alt=""
                  className="w-12 h-12 object-contain drop-shadow"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div className="text-left">
                  <span className="text-[10px] text-blue-400 font-bold uppercase block">Time 1</span>
                  <span className="text-white font-black text-sm block leading-tight">{teamAObj.name}</span>
                  <button
                    onClick={() => setTempA("")}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    remover
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center text-lg font-bold">
                  1
                </div>
                <span className="text-xs italic">Escolha o 1º time</span>
              </div>
            )}
          </div>

          {/* VS badge */}
          <div className="w-8 h-8 rounded-full bg-yellow-400 text-gray-950 font-black text-xs flex items-center justify-center shadow-lg shadow-yellow-400/20">
            VS
          </div>

          {/* Team B */}
          <div className="flex items-center gap-3 min-w-[140px] justify-end">
            {teamBObj ? (
              <>
                <div className="text-right">
                  <span className="text-[10px] text-red-400 font-bold uppercase block">Time 2</span>
                  <span className="text-white font-black text-sm block leading-tight">{teamBObj.name}</span>
                  <button
                    onClick={() => setTempB("")}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    remover
                  </button>
                </div>
                <img
                  src={getLogoUrl(teamBObj, 150)}
                  alt=""
                  className="w-12 h-12 object-contain drop-shadow"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-xs italic">Escolha o 2º time</span>
                <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center text-lg font-bold">
                  2
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0 bg-gray-900/60">
          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-yellow-400 text-gray-950 shadow-md font-extrabold"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              placeholder="Buscar time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-3 pr-8 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body content: either ESPN official games list or individual teams grid */}
        {activeTab === "ESPN_GAMES" ? (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {/* Quick sub-filter for ESPN games */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOnlyLeagueGames(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    onlyLeagueGames
                      ? "bg-yellow-400 text-gray-950 font-black shadow-sm"
                      : "bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700/50"
                  }`}
                >
                  <span>★ Jogos do Bolão ({espnGames.filter(g => selectedTeamIds.includes(g.awayTeam?.id) || selectedTeamIds.includes(g.homeTeam?.id)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyLeagueGames(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !onlyLeagueGames
                      ? "bg-yellow-400 text-gray-950 font-black shadow-sm"
                      : "bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700/50"
                  }`}
                >
                  <span>Todos os Jogos ({espnGames.length})</span>
                </button>
              </div>
              <span className="text-[11px] text-yellow-500/80 font-medium">
                {onlyLeagueGames ? "Padrão: apenas confrontos com times da sua liga" : "Todos os confrontos da rodada"}
              </span>
            </div>

            {loadingEspn ? (
              <div className="py-12 text-center text-gray-500">
                <span className="text-2xl animate-spin inline-block mb-2">🏈</span>
                <p className="text-xs font-bold">Buscando jogos oficiais na ESPN...</p>
              </div>
            ) : espnGames.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <p className="text-xs">Nenhum jogo encontrado na ESPN no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {espnGames
                  .filter((g) => {
                    const involvesLeague =
                      selectedTeamIds.includes(g.awayTeam?.id) ||
                      selectedTeamIds.includes(g.homeTeam?.id);

                    if (onlyLeagueGames && !involvesLeague) return false;

                    if (!search) return true;
                    return (
                      g.awayTeam.name.toLowerCase().includes(search.toLowerCase()) ||
                      g.homeTeam.name.toLowerCase().includes(search.toLowerCase())
                    );
                  })
                  .map((game) => {
                    const isSelectedMatchup =
                      (tempA === game.awayTeam.id && tempB === game.homeTeam.id) ||
                      (tempA === game.homeTeam.id && tempB === game.awayTeam.id);

                    const involvesLeague =
                      selectedTeamIds.includes(game.awayTeam?.id) ||
                      selectedTeamIds.includes(game.homeTeam?.id);

                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          setTempA(game.awayTeam.id);
                          setTempB(game.homeTeam.id);
                        }}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelectedMatchup
                            ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/15"
                            : "border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-800/60 text-[10px]">
                          <span className="text-gray-400 font-bold">
                            {game.isLive ? (
                              <span className="text-red-400 font-black">🔴 AO VIVO</span>
                            ) : game.isCompleted ? (
                              <span className="text-gray-400">Final</span>
                            ) : (
                              game.formattedTime
                            )}
                          </span>
                          {involvesLeague && (
                            <span className="text-yellow-400 font-black bg-yellow-400/15 px-1.5 py-0.2 rounded border border-yellow-400/30">
                              ★ Bolão
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 py-1">
                          {/* Away */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <img
                              src={getLogoUrl(game.awayTeam)}
                              alt=""
                              className="w-8 h-8 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.target.src = game.awayTeam.logo;
                              }}
                            />
                            <span className="text-white font-black text-xs truncate">
                              {game.awayTeam.name}
                            </span>
                          </div>

                          <span className="text-gray-500 font-black text-xs px-1">VS</span>

                          {/* Home */}
                          <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                            <span className="text-white font-black text-xs truncate">
                              {game.homeTeam.name}
                            </span>
                            <img
                              src={getLogoUrl(game.homeTeam)}
                              alt=""
                              className="w-8 h-8 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.target.src = game.homeTeam.logo;
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-2 pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">
                            {game.broadcast ? `📺 ${game.broadcast}` : "NFL Oficial"}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isSelectedMatchup ? "text-yellow-400" : "text-gray-400"
                            }`}
                          >
                            {isSelectedMatchup ? "✓ Selecionado" : "Clique p/ escolher"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* Grid of Teams */
          <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {filteredTeams.map((team) => {
              const isPickedA = tempA === team.id;
              const isPickedB = tempB === team.id;
              const isPicked = isPickedA || isPickedB;
              const inUserLeague = selectedTeamIds.includes(team.id);

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handlePickTeam(team.id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${
                    isPickedA
                      ? "border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/20 scale-[1.02]"
                      : isPickedB
                      ? "border-red-500 bg-red-950/40 shadow-lg shadow-red-500/20 scale-[1.02]"
                      : "border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-800/40"
                  }`}
                >
                  {/* League badge */}
                  {inUserLeague && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/15 border border-yellow-400/30 px-1 rounded">
                      ★ Bolão
                    </span>
                  )}

                  {/* Selected badge */}
                  {isPicked && (
                    <span
                      className={`absolute top-1.5 right-1.5 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        isPickedA ? "bg-blue-500" : "bg-red-500"
                      }`}
                    >
                      {isPickedA ? "1" : "2"}
                    </span>
                  )}

                  {/* Logo */}
                  <img
                    src={getLogoUrl(team, 150)}
                    alt={team.name}
                    className="w-14 h-14 object-contain my-1 transition-transform group-hover:scale-110 drop-shadow"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />

                  {/* Name */}
                  <span className="text-xs font-bold text-white mt-1 line-clamp-1 leading-tight">
                    {team.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {team.conference} · {team.division}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">
            {tempA && tempB
              ? "Pronto para confirmar o confronto!"
              : "Selecione 2 times para liberar a confirmação"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!tempA || !tempB}
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${
                tempA && tempB
                  ? "bg-yellow-400 text-gray-950 hover:bg-yellow-300 shadow-md shadow-yellow-400/20 cursor-pointer"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              Confirmar Confronto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
