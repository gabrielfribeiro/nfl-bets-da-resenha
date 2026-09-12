import { useState, useMemo } from "react";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";

export default function PotEvolutionChart({ selectedTeamIds, teams, bets, currentRound, INITIAL_POT = 1 }) {
  const [viewMode, setViewMode] = useState("TOP_5"); // 'TOP_5' | 'ALL' | 'BOTTOM_4' | 'CUSTOM'
  const [focusedTeamId, setFocusedTeamId] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null); // { teamId, round, pot, x, y }

  // Rounds to display on X axis: from 0 (Initial) to currentRound (or max round with bets)
  const maxBetRound = bets.reduce((max, b) => Math.max(max, Number(b.round) || 1), currentRound);
  const totalRounds = Math.max(1, maxBetRound);
  const roundLabels = useMemo(() => {
    const labels = [{ round: 0, label: "Início" }];
    for (let r = 1; r <= totalRounds; r++) {
      labels.push({ round: r, label: `Rd #${r}` });
    }
    return labels;
  }, [totalRounds]);

  // Calculate chronological pot for each team at the end of each round
  const timelineData = useMemo(() => {
    // Sort bets chronologically
    const sortedBets = [...bets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return selectedTeamIds.map((id) => {
      const team = getTeamById(id);
      const teamState = teams[id] || { pot: INITIAL_POT, addedFunds: 0 };
      const teamBets = sortedBets.filter((b) => b.bettingOnTeamId === id);

      // Value at round 0
      const points = [{ round: 0, pot: INITIAL_POT }];

      let runningPot = INITIAL_POT;
      for (let r = 1; r <= totalRounds; r++) {
        // Find last bet resolved in or before this round
        const betsUpToRound = teamBets.filter((b) => Number(b.round) <= r && b.result !== "pending");
        if (betsUpToRound.length > 0) {
          const lastBet = betsUpToRound[betsUpToRound.length - 1];
          runningPot = lastBet.potAfter;
        } else if (r === totalRounds) {
          // If no resolved bets up to this round, use current pot
          runningPot = teamState.pot;
        }
        points.push({ round: r, pot: runningPot });
      }

      const currentPot = teamState.pot;
      const initialPot = INITIAL_POT;
      const totalGrowth = currentPot - initialPot;
      const growthPercent = initialPot > 0 ? (totalGrowth / initialPot) * 100 : 0;

      return {
        id,
        team,
        color: team?.color || "#eab308",
        accent: team?.accent || "#fbbf24",
        points,
        currentPot,
        totalGrowth,
        growthPercent,
      };
    });
  }, [selectedTeamIds, teams, bets, totalRounds, INITIAL_POT]);

  // Determine top 5 and bottom 4
  const sortedByPot = useMemo(() => {
    return [...timelineData].sort((a, b) => b.currentPot - a.currentPot);
  }, [timelineData]);

  const top5Ids = useMemo(() => sortedByPot.slice(0, 5).map((t) => t.id), [sortedByPot]);
  const bottom4Ids = useMemo(() => sortedByPot.slice(Math.max(0, sortedByPot.length - 4)).map((t) => t.id), [sortedByPot]);

  // Teams to render based on viewMode
  const visibleTeams = useMemo(() => {
    if (focusedTeamId) {
      return timelineData;
    }
    if (viewMode === "TOP_5") {
      return timelineData.filter((t) => top5Ids.includes(t.id));
    }
    if (viewMode === "BOTTOM_4") {
      return timelineData.filter((t) => bottom4Ids.includes(t.id));
    }
    return timelineData; // 'ALL'
  }, [timelineData, viewMode, top5Ids, bottom4Ids, focusedTeamId]);

  // Find max pot to scale Y axis
  const maxPotValue = useMemo(() => {
    let max = 2.0;
    timelineData.forEach((t) => {
      t.points.forEach((p) => {
        if (p.pot > max) max = p.pot;
      });
    });
    return Math.ceil(max * 1.25 * 10) / 10; // 25% head room
  }, [timelineData]);

  // SVG dimensions
  const width = 800;
  const height = 340;
  const padding = { top: 30, right: 35, bottom: 40, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scale functions
  const getX = (roundIndex) => {
    if (roundLabels.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (roundIndex / (roundLabels.length - 1)) * graphWidth;
  };

  const getY = (potValue) => {
    const clamped = Math.max(0, Math.min(maxPotValue, potValue));
    return padding.top + graphHeight - (clamped / maxPotValue) * graphHeight;
  };

  // Average Pot calculation
  const currentAveragePot =
    timelineData.reduce((sum, t) => sum + t.currentPot, 0) / (timelineData.length || 1);
  const averageY = getY(currentAveragePot);

  // Y-axis grid lines (5 steps)
  const yTicks = [0, maxPotValue * 0.25, maxPotValue * 0.5, maxPotValue * 0.75, maxPotValue];

  // Highlights
  const bestGainer = [...timelineData].sort((a, b) => b.totalGrowth - a.totalGrowth)[0];
  const lowestPot = [...timelineData].sort((a, b) => a.currentPot - b.currentPot)[0];

  return (
    <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Chart Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <h3 className="text-white font-black text-base">Evolução dos Potes na Temporada</h3>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Trajetória financeira de cada participante rodada a rodada
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setViewMode("TOP_5");
              setFocusedTeamId(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              viewMode === "TOP_5" && !focusedTeamId
                ? "bg-yellow-400 text-gray-950 font-black shadow-md"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Top 5 Líderes
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("BOTTOM_4");
              setFocusedTeamId(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              viewMode === "BOTTOM_4" && !focusedTeamId
                ? "bg-rose-500 text-white font-black shadow-md"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Degola (Bottom 4)
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("ALL");
              setFocusedTeamId(null);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              viewMode === "ALL" && !focusedTeamId
                ? "bg-emerald-500 text-gray-950 font-black shadow-md"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Todos ({timelineData.length})
          </button>
        </div>
      </div>

      {/* Team Chips selector for direct focus */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-gray-500 text-[10px] font-bold uppercase mr-1 flex-shrink-0">
          Focar Time:
        </span>
        {timelineData.map((t) => {
          const isFocused = focusedTeamId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFocusedTeamId(isFocused ? null : t.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0 transition-all border ${
                isFocused
                  ? "bg-yellow-400 text-gray-950 font-black border-yellow-400 shadow-md scale-105"
                  : "bg-gray-800/80 border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              <img
                src={getLogoUrl(t.team, 100)}
                alt=""
                className="w-3.5 h-3.5 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <span>{t.team?.name?.split(" ").pop()}</span>
              <span className="text-[10px] opacity-75">R${t.currentPot.toFixed(1)}</span>
            </button>
          );
        })}
        {focusedTeamId && (
          <button
            type="button"
            onClick={() => setFocusedTeamId(null)}
            className="text-[10px] font-bold text-gray-400 hover:text-yellow-400 underline ml-2 flex-shrink-0"
          >
            Limpar Foco
          </button>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden bg-gray-950/60 border border-gray-800/80 rounded-2xl p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Glow filters for lines */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Grid Lines (Y-Axis) */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize="10"
                  fontWeight="bold"
                >
                  R${val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Average Line */}
          <line
            x1={padding.left}
            y1={averageY}
            x2={width - padding.right}
            y2={averageY}
            stroke="#eab308"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <text
            x={width - padding.right}
            y={averageY - 5}
            textAnchor="end"
            fill="#eab308"
            fontSize="9"
            fontWeight="bold"
            opacity="0.8"
          >
            MÉDIA DA LIGA: R$ {currentAveragePot.toFixed(2)}
          </text>

          {/* Round Lines (X-Axis) */}
          {roundLabels.map((lbl, idx) => {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.4"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {lbl.label}
                </text>
              </g>
            );
          })}

          {/* Render Team Paths */}
          {visibleTeams.map((t) => {
            const isFocused = focusedTeamId === t.id;
            const isDimmed = focusedTeamId && !isFocused;

            // Generate SVG path string
            const pathString = t.points.reduce((acc, pt, idx) => {
              const x = getX(idx);
              const y = getY(pt.pot);
              return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
            }, "");

            const strokeColor = t.color || "#eab308";
            const strokeWidth = isFocused ? 4 : 2.5;
            const opacity = isDimmed ? 0.15 : isFocused ? 1 : 0.85;

            return (
              <g key={t.id} className="transition-opacity duration-300">
                {/* Line glow if focused */}
                {isFocused && (
                  <path
                    d={pathString}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={8}
                    opacity="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Main Path */}
                <path
                  d={pathString}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isFocused ? "url(#lineGlow)" : undefined}
                />

                {/* Circles at each round point */}
                {t.points.map((pt, idx) => {
                  const cx = getX(idx);
                  const cy = getY(pt.pot);
                  const isHovered =
                    hoveredPoint?.teamId === t.id && hoveredPoint?.round === pt.round;

                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : isFocused ? 4.5 : 3.5}
                      fill={strokeColor}
                      stroke="#030712"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      opacity={opacity}
                      className="cursor-pointer transition-all hover:scale-125"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          teamId: t.id,
                          team: t.team,
                          round: pt.round,
                          pot: pt.pot,
                          x: cx,
                          y: cy,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-30 bg-gray-900/95 border border-yellow-400/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-md transition-all text-xs"
            style={{
              left: `${Math.min(hoveredPoint.x + 10, width - 160)}px`,
              top: `${Math.max(10, hoveredPoint.y - 65)}px`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <img
                src={getLogoUrl(hoveredPoint.team, 100)}
                alt=""
                className="w-5 h-5 object-contain"
              />
              <span className="font-black text-white">{hoveredPoint.team?.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-gray-400">
                {hoveredPoint.round === 0 ? "Início" : `Rodada #${hoveredPoint.round}`}:
              </span>
              <span className="text-yellow-400 font-black">
                R$ {hoveredPoint.pot.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Highlights Cards below chart */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚀</span>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                Maior Crescimento
              </span>
              <span className="text-white font-black text-xs block">
                {bestGainer?.team?.name}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-emerald-400 font-black text-xs block">
              +{bestGainer?.totalGrowth >= 0 ? `R$ ${bestGainer?.totalGrowth.toFixed(2)}` : "R$ 0,00"}
            </span>
            <span className="text-emerald-500/80 text-[10px] font-bold">
              +{bestGainer?.growthPercent.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👑</span>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                Pote Máximo Atual
              </span>
              <span className="text-white font-black text-xs block">
                {sortedByPot[0]?.team?.name}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-yellow-400 font-black text-sm block">
              R$ {sortedByPot[0]?.currentPot.toFixed(2)}
            </span>
            <span className="text-gray-400 text-[10px]">1º colocado</span>
          </div>
        </div>

        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚨</span>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                Em Risco / Lanterna
              </span>
              <span className="text-white font-black text-xs block">
                {lowestPot?.team?.name}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-rose-400 font-black text-sm block">
              R$ {lowestPot?.currentPot.toFixed(2)}
            </span>
            <span className="text-rose-500/80 text-[10px]">Alvo do castigo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
