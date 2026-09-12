import { getTeamById, getLogoUrl } from "../../data/nflTeams";

export default function TrophyCase({ bets, teams, selectedTeamIds }) {
  if (!bets || bets.length === 0) return null;

  const resolvedBets = bets.filter((b) => b.result === "win" || b.result === "loss");
  const wonBets = bets.filter((b) => b.result === "win");

  // 1. Maior Retorno Único (Biggest Cash)
  let biggestWinBet = null;
  let maxWinAmount = 0;
  wonBets.forEach((b) => {
    const profit = b.amount * (b.odd - 1);
    if (profit > maxWinAmount) {
      maxWinAmount = profit;
      biggestWinBet = b;
    }
  });

  // 2. Maior Odd Batida (Underdog Master)
  let highestOddBet = null;
  let maxOddVal = 0;
  wonBets.forEach((b) => {
    if (b.odd > maxOddVal) {
      maxOddVal = b.odd;
      highestOddBet = b;
    }
  });

  // 3. Time Mais Confiável (Highest Win Rate com min 2 apostas)
  let bestWinRateTeam = null;
  let highestWinRate = 0;
  let bestTeamRecord = "";

  // 4. Troféu Pé Frio / Marmita Estragada (time com mais derrotas ou maior prejuízo)
  let worstTeamId = null;
  let maxLosses = 0;
  let maxLossAmount = 0;

  selectedTeamIds.forEach((id) => {
    const t = teams[id];
    if (t) {
      const total = t.totalWins + t.totalLosses;
      if (total >= 2) {
        const rate = (t.totalWins / total) * 100;
        if (rate > highestWinRate) {
          highestWinRate = rate;
          bestWinRateTeam = id;
          bestTeamRecord = `${t.totalWins}V - ${t.totalLosses}D`;
        }
      }

      // Calculate total money lost by this team
      const teamLostBets = bets.filter((b) => b.bettingOnTeamId === id && b.result === "loss");
      const lossAmount = teamLostBets.reduce((sum, b) => sum + (b.powerUp === "shield" ? 0 : b.amount), 0);

      if (t.totalLosses > maxLosses || (t.totalLosses === maxLosses && lossAmount > maxLossAmount)) {
        if (t.totalLosses > 0) {
          maxLosses = t.totalLosses;
          maxLossAmount = lossAmount;
          worstTeamId = id;
        }
      }
    }
  });

  const biggestWinTeam = biggestWinBet ? getTeamById(biggestWinBet.bettingOnTeamId) : null;
  const highestOddTeam = highestOddBet ? getTeamById(highestOddBet.bettingOnTeamId) : null;
  const bestTeamObj = bestWinRateTeam ? getTeamById(bestWinRateTeam) : null;
  const worstTeamObj = worstTeamId ? getTeamById(worstTeamId) : null;

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-black text-lg flex items-center gap-2">
            <span>🎖️</span>
            <span>Sala de Troféus (Recordes)</span>
          </h3>
          <p className="text-gray-400 text-xs">Marcos históricos conquistados no bolão</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Record 1: Maior Ganho Único */}
        <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-2xl flex-shrink-0">
            💰
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Maior Lucro Único</p>
            {biggestWinBet ? (
              <>
                <p className="text-yellow-400 font-black text-base truncate">
                  +R$ {maxWinAmount.toFixed(2)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={getLogoUrl(biggestWinTeam, 100)} alt="" className="w-4 h-4 object-contain" />
                  <span className="text-gray-300 text-xs truncate">{biggestWinTeam?.name}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs italic mt-1">Ainda sem vitórias</p>
            )}
          </div>
        </div>

        {/* Record 2: Maior Odd Batida */}
        <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-2xl flex-shrink-0">
            🎯
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Maior Odd Batida</p>
            {highestOddBet ? (
              <>
                <p className="text-purple-400 font-black text-base truncate">
                  Odd {maxOddVal.toFixed(2)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={getLogoUrl(highestOddTeam, 100)} alt="" className="w-4 h-4 object-contain" />
                  <span className="text-gray-300 text-xs truncate">{highestOddTeam?.name}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs italic mt-1">Aguardando resultados</p>
            )}
          </div>
        </div>

        {/* Record 3: Maior Aproveitamento */}
        <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-2xl flex-shrink-0">
            📈
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Maior Aproveitamento</p>
            {bestTeamObj ? (
              <>
                <p className="text-emerald-400 font-black text-base truncate">
                  {highestWinRate.toFixed(0)}% de Acerto
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={getLogoUrl(bestTeamObj, 100)} alt="" className="w-4 h-4 object-contain" />
                  <span className="text-gray-300 text-xs truncate">{bestTeamObj?.name} ({bestTeamRecord})</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs italic mt-1">Mín. 2 jogos p/ qualificar</p>
            )}
          </div>
        </div>

        {/* Record 4: Troféu Pé Frio (Marmita Estragada) */}
        <div className="bg-gray-950/70 border border-red-900/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl flex-shrink-0">
            🐟
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-red-400 text-[11px] font-bold uppercase tracking-wider">Troféu Pé Frio</p>
            {worstTeamObj ? (
              <>
                <p className="text-red-400 font-black text-base truncate">
                  {maxLosses} {maxLosses === 1 ? "Derrota" : "Derrotas"} (-R$ {maxLossAmount.toFixed(2)})
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={getLogoUrl(worstTeamObj, 100)} alt="" className="w-4 h-4 object-contain" />
                  <span className="text-gray-300 text-xs truncate">{worstTeamObj?.name}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs italic mt-1">Nenhum zicado ainda!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
