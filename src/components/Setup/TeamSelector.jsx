import { useState } from "react";
import { NFL_TEAMS, getLogoUrl } from "../../data/nflTeams";
import { useBet } from "../../context/BetContext";

const DIVISIONS = ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];

export default function TeamSelector() {
  const { completeSetup } = useBet();
  const [selected, setSelected] = useState([]);

  const grouped = DIVISIONS.reduce((acc, div) => {
    const [conf, division] = div.split(" ");
    acc[div] = NFL_TEAMS.filter((t) => t.conference === conf && t.division === division);
    return acc;
  }, {});

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 16
        ? [...prev, id]
        : prev
    );
  };

  const handleStart = () => {
    if (selected.length === 16) completeSetup(selected);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏈</div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">NFL Bets da Resenha</h1>
          <p className="text-gray-400 text-lg">Escolha <span className="text-yellow-400 font-bold">16 times</span> para participar da bolão</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-800 rounded-full px-5 py-2">
            <span className={`font-bold text-xl ${selected.length === 16 ? "text-green-400" : "text-yellow-400"}`}>
              {selected.length}/16
            </span>
            <span className="text-gray-400 text-sm">selecionados</span>
          </div>
        </div>

        {/* Teams Grid */}
        {DIVISIONS.map((div) => (
          <div key={div} className="mb-6">
            <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3 pl-1">{div}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {grouped[div].map((team) => {
                const isSelected = selected.includes(team.id);
                const isDisabled = !isSelected && selected.length >= 16;
                return (
                  <button
                    key={team.id}
                    onClick={() => toggle(team.id)}
                    disabled={isDisabled}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 
                      ${isSelected
                        ? "border-yellow-400 shadow-lg shadow-yellow-400/20"
                        : isDisabled
                        ? "border-gray-800 opacity-40 cursor-not-allowed"
                        : "border-gray-700 hover:border-gray-500"
                      }`}
                    style={isSelected ? { backgroundColor: team.color + "33" } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={getLogoUrl(team, 100)}
                        alt={team.name}
                        className={`w-8 h-8 object-contain flex-shrink-0 transition-opacity ${isDisabled ? "opacity-40" : ""}`}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {isSelected && (
                        <span className="ml-auto text-yellow-400 text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold leading-tight block">{team.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Start Button */}
        <div className="sticky bottom-4 flex justify-center mt-6">
          <button
            onClick={handleStart}
            disabled={selected.length !== 16}
            className={`px-10 py-4 rounded-2xl font-black text-lg transition-all duration-200 shadow-2xl
              ${selected.length === 16
                ? "bg-yellow-400 text-gray-950 hover:bg-yellow-300 hover:scale-105"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
          >
            {selected.length === 16 ? "🚀 Começar Bolão!" : `Selecione mais ${16 - selected.length} time(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
