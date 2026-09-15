import { useBet } from "../../context/BetContext";
import { getTeamById, getLogoUrl } from "../../data/nflTeams";

export default function BroadcastTicker() {
  const { bets, teams, selectedTeamIds, currentRound } = useBet();

  // Extract recent resolved events and leader highlights
  const recentBets = bets.slice(0, 10);
  
  // Sorted leaders
  const sortedLeaders = [...selectedTeamIds]
    .map((id) => ({ id, team: getTeamById(id), pot: teams[id]?.pot ?? 0 }))
    .sort((a, b) => b.pot - a.pot);

  const top1 = sortedLeaders[0];
  const top2 = sortedLeaders[1];

  const items = [
    {
      id: "header",
      badge: "NFL REDZONE",
      badgeBg: "bg-red-600 text-white",
      text: `RODADA #${currentRound} EM ANDAMENTO`,
    },
    ...(top1
      ? [
          {
            id: "leader1",
            badge: "LÍDER",
            badgeBg: "bg-yellow-500 text-gray-950",
            text: `${top1.team?.name}: R$ ${top1.pot.toFixed(2)}`,
            logo: top1.team,
          },
        ]
      : []),
    ...(top2
      ? [
          {
            id: "leader2",
            badge: "VICE",
            badgeBg: "bg-slate-300 text-gray-950",
            text: `${top2.team?.name}: R$ ${top2.pot.toFixed(2)}`,
            logo: top2.team,
          },
        ]
      : []),
    ...recentBets.map((b) => {
      const team = getTeamById(b.bettingOnTeamId);
      const isWin = b.result === "win";
      const isLoss = b.result === "loss";
      return {
        id: b.id,
        badge: isWin ? "BATEU" : isLoss ? "PERDEU" : "EM ABERTO",
        badgeBg: isWin
          ? "bg-emerald-500 text-gray-950"
          : isLoss
          ? "bg-red-500 text-white"
          : "bg-amber-400 text-gray-950",
        text: `${team?.name}: R$ ${b.amount.toFixed(2)} (Odd ${b.odd})`,
        logo: team,
      };
    }),
  ];

  // Duplica exatamente para loop contínuo e suave com -50% de translação
  let filledItems = items;
  while (filledItems.length < 8 && items.length > 0) {
    filledItems = [...filledItems, ...items];
  }
  const tickerItems = [...filledItems, ...filledItems];

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-gray-950/95 border-t border-red-600/60 z-30 overflow-hidden backdrop-blur-md shadow-2xl">
      <div className="flex items-center h-8">
        {/* Static Broadcast Tag */}
        <div className="flex items-center justify-center gap-2 bg-red-600 px-3.5 h-full flex-shrink-0 z-10 shadow-lg font-black text-white text-[11px] tracking-wider uppercase leading-none select-none">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="leading-none flex items-center">ESPN / REDZONE TICKER</span>
        </div>

        {/* Marquee Scroller */}
        <div className="overflow-hidden whitespace-nowrap flex-1 h-full flex items-center">
          <div className="animate-marquee items-center gap-8 h-full">
            {tickerItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-300 font-semibold leading-none h-full"
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider leading-none flex items-center ${item.badgeBg}`}
                >
                  {item.badge}
                </span>
                {item.logo && (
                  <img
                    src={getLogoUrl(item.logo, 100)}
                    alt=""
                    className="w-4 h-4 object-contain inline-block flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <span className="text-gray-200 leading-none flex items-center">{item.text}</span>
                <span className="text-gray-600 font-bold ml-3 leading-none">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
