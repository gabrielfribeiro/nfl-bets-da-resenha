import { useState, useEffect } from "react";
import { fetchGameSummary } from "../../services/espnApi";
import { getLogoUrl } from "../../data/nflTeams";

const CATEGORY_TABS = [
  { id: "passing", label: "🎯 Passes (QB)", icon: "🎯" },
  { id: "rushing", label: "🏃 Corridas (RB)", icon: "🏃" },
  { id: "receiving", label: "🙌 Recepções (WR/TE)", icon: "🙌" },
  { id: "defensive", label: "💥 Defesa", icon: "💥" },
  { id: "kicking", label: "👟 Chutes (K)", icon: "👟" },
];

export default function GameBoxscoreModal({ isOpen, onClose, eventId, initialSummary = null }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("passing");
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    if (initialSummary && initialSummary.id === eventId) {
      setSummary(initialSummary);
      return;
    }

    if (eventId) {
      setLoading(true);
      fetchGameSummary(eventId)
        .then((data) => {
          if (data) setSummary(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, eventId, initialSummary]);

  if (!isOpen) return null;

  const header = summary?.header;
  const teamsBox = summary?.boxscore || [];
  const currentTeamBox = teamsBox[selectedTeamIdx] || teamsBox[0];
  const currentCategory = currentTeamBox?.categories?.find(
    (c) => c.name === activeCategory
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header: Matchup & Score */}
        <div className="p-4 sm:p-5 border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            {/* Away Team */}
            <div className="flex items-center gap-2">
              <img
                src={getLogoUrl(header?.awayTeam, 100)}
                alt={header?.awayTeam?.name || "Visitante"}
                className="w-10 h-10 object-contain drop-shadow"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div>
                <span className="text-white font-black text-xs sm:text-sm block line-clamp-1">
                  {header?.awayTeam?.name || "Visitante"}
                </span>
                <span className="text-gray-400 text-[10px]">Visitante</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-white ml-1 sm:ml-2">
                {header?.awayTeam?.score}
              </span>
            </div>

            <div className="text-center px-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                {header?.statusDetail || "Final"}
              </span>
              <span className="block text-[10px] text-gray-500 font-bold mt-0.5">VS</span>
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-white mr-1 sm:mr-2">
                {header?.homeTeam?.score}
              </span>
              <img
                src={getLogoUrl(header?.homeTeam, 100)}
                alt={header?.homeTeam?.name || "Mandante"}
                className="w-10 h-10 object-contain drop-shadow"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div>
                <span className="text-white font-black text-xs sm:text-sm block line-clamp-1">
                  {header?.homeTeam?.name || "Mandante"}
                </span>
                <span className="text-gray-400 text-[10px]">Mandante</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Team Selector Pills */}
        {teamsBox.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-950/60 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-xs font-bold mr-1">Visualizar time:</span>
              {teamsBox.map((t, idx) => {
                const isSelected = selectedTeamIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTeamIdx(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-yellow-400 text-gray-950 shadow-md font-extrabold"
                        : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50"
                    }`}
                  >
                    <img
                      src={getLogoUrl(t.team, 50)}
                      alt=""
                      className="w-4 h-4 object-contain"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span>{t.teamName}</span>
                  </button>
                );
              })}
            </div>

            {summary?.odds?.details && (
              <span className="text-[11px] text-gray-400 font-semibold bg-gray-900 border border-gray-800 px-2.5 py-0.5 rounded-lg">
                Linha: <strong className="text-yellow-400">{summary.odds.details}</strong> · O/U {summary.odds.overUnder}
              </span>
            )}
          </div>
        )}

        {/* Category Tabs */}
        <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? "bg-gray-800 text-yellow-400 border border-yellow-400/40 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/40"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: Player Boxscore Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <span className="text-3xl animate-spin inline-block">🏈</span>
              <p className="text-xs font-bold">Carregando estatísticas dos atletas...</p>
            </div>
          ) : !currentCategory || !currentCategory.athletes || currentCategory.athletes.length === 0 ? (
            <div className="py-16 text-center text-gray-500 space-y-2">
              <span className="text-3xl block">📋</span>
              <p className="text-xs font-bold">
                Nenhum dado registrado para esta categoria nesta partida.
              </p>
              <p className="text-[11px] text-gray-600">
                Tente alternar para outra categoria (Passes, Corridas ou Recepções) acima.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950 text-gray-400 font-bold border-b border-gray-800 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 min-w-[150px]">Atleta</th>
                    {currentCategory.labels.map((lbl, i) => (
                      <th key={i} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium">
                  {currentCategory.athletes.map((ath, i) => (
                    <tr
                      key={ath.id || i}
                      className="hover:bg-gray-800/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 flex items-center gap-2.5">
                        <img
                          src={ath.headshot}
                          alt={ath.name}
                          className="w-7 h-7 rounded-full object-cover bg-gray-800 border border-gray-700 flex-shrink-0"
                          onError={(e) => {
                            e.target.src = "https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=60&h=60&scale=crop";
                          }}
                        />
                        <div className="min-w-0">
                          <span className="text-white font-bold block truncate group-hover:text-yellow-400 transition-colors">
                            {ath.name}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {ath.position ? `${ath.position} ` : ""}
                            {ath.jersey ? `#${ath.jersey}` : ""}
                          </span>
                        </div>
                      </td>
                      {ath.stats.map((val, sIdx) => (
                        <td
                          key={sIdx}
                          className="py-2.5 px-3 text-center text-gray-300 font-mono text-xs whitespace-nowrap"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between flex-shrink-0 text-xs text-gray-500">
          <span>Dados oficiais fornecidos pela ESPN Sports Analytics</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
