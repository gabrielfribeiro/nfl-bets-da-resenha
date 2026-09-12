import { useState } from "react";
import { BetProvider, useBet } from "./context/BetContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import TeamSelector from "./components/Setup/TeamSelector";
import Dashboard from "./components/Dashboard/Dashboard";
import NewBet from "./components/Bet/NewBet";
import BetHistory from "./components/Bet/BetHistory";
import Achievements from "./components/Achievements/Achievements";
import Navbar from "./components/Shared/Navbar";
import Settings from "./components/Shared/Settings";
import UserManager from "./components/Admin/UserManager";
import UserProfile from "./components/User/UserProfile";
import Rules from "./components/Rules/Rules";
import BroadcastTicker from "./components/Shared/BroadcastTicker";
import LoginModal from "./components/Auth/LoginModal";

import GamesLive from "./components/Games/GamesLive";
import TeamStats from "./components/Stats/TeamStats";
import ShareModal from "./components/Dashboard/ShareModal";

function AppContent() {
  const { setupComplete } = useBet();
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [preselectedMatchup, setPreselectedMatchup] = useState(null);
  const [preselectedStatsMatchup, setPreselectedStatsMatchup] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleQuickBet = (teamA, teamB, round) => {
    setPreselectedMatchup({ teamA, teamB, round });
    setActiveTab("new-bet");
  };

  const handleCompareStats = (teamA, teamB) => {
    setPreselectedStatsMatchup({ teamA, teamB });
    setActiveTab("stats");
  };

  const handleTabChange = (tab) => {
    if (tab === "stats") {
      // Se clicou diretamente para abrir a aba de estatísticas, limpa confronto anterior
      setPreselectedStatsMatchup(null);
    }
    setActiveTab(tab);
  };

  // 1. Enquanto carrega a sessão de autenticação do Firebase
  if (loading) {
    return (
      <div className="bg-gray-950 min-h-screen flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-500 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 animate-bounce mb-4">
          🏈
        </div>
        <p className="text-white font-black text-xl">NFL Bets da Resenha</p>
        <p className="text-gray-500 text-xs mt-2 flex items-center gap-2">
          <span className="animate-spin inline-block">⏳</span> Verificando autenticação...
        </p>
      </div>
    );
  }

  // 2. OBRIGATÓRIO ESTAR LOGADO: se não estiver autenticado, exibe a tela de login exclusiva
  if (!isAuthenticated) {
    return <LoginModal forceOpen={true} />;
  }

  if (!setupComplete) {
    return (
      <>
        <TeamSelector />
        <LoginModal />
      </>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen text-white pb-28">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenShareModal={() => setShowShareModal(true)}
      />
      <main>
        {activeTab === "dashboard" && <Dashboard onOpenTab={handleTabChange} />}
        {activeTab === "games" && (
          <GamesLive
            onQuickBet={handleQuickBet}
            onOpenStats={handleCompareStats}
          />
        )}
        {activeTab === "stats" && (
          <TeamStats
            initialTeamA={preselectedStatsMatchup?.teamA}
            initialTeamB={preselectedStatsMatchup?.teamB}
            onGoToNewBet={handleQuickBet}
            onOpenTab={handleTabChange}
          />
        )}
        {activeTab === "new-bet" && (
          <NewBet
            initialMatchup={preselectedMatchup}
            onClearInitialMatchup={() => setPreselectedMatchup(null)}
          />
        )}
        {activeTab === "history" && (
          <BetHistory onOpenNewBet={() => setActiveTab("new-bet")} />
        )}
        {activeTab === "achievements" && <Achievements />}
        {activeTab === "profile" && <UserProfile onOpenTab={setActiveTab} />}
        {activeTab === "rules" && <Rules onOpenTab={setActiveTab} />}
        {activeTab === "settings" && (
          isAdmin ? (
            <Settings
              onOpenUserManager={() => setActiveTab("users")}
              onOpenTab={setActiveTab}
            />
          ) : (
            <UserProfile onOpenTab={setActiveTab} />
          )
        )}
        {activeTab === "users" && (
          isAdmin ? (
            <UserManager onBack={() => setActiveTab("dashboard")} />
          ) : (
            <UserProfile onOpenTab={setActiveTab} />
          )
        )}
      </main>
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      <LoginModal />
      <BroadcastTicker />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BetProvider>
        <AppContent />
      </BetProvider>
    </AuthProvider>
  );
}
