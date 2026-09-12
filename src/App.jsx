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
import BroadcastTicker from "./components/Shared/BroadcastTicker";
import LoginModal from "./components/Auth/LoginModal";

import GamesLive from "./components/Games/GamesLive";
import ShareModal from "./components/Dashboard/ShareModal";

function AppContent() {
  const { setupComplete } = useBet();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [preselectedMatchup, setPreselectedMatchup] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleQuickBet = (teamA, teamB, round) => {
    setPreselectedMatchup({ teamA, teamB, round });
    setActiveTab("new-bet");
  };

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
        setActiveTab={setActiveTab}
        onOpenShareModal={() => setShowShareModal(true)}
      />
      <main>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "games" && <GamesLive onQuickBet={handleQuickBet} />}
        {activeTab === "new-bet" && (
          <NewBet
            initialMatchup={preselectedMatchup}
            onClearInitialMatchup={() => setPreselectedMatchup(null)}
          />
        )}
        {activeTab === "history" && <BetHistory />}
        {activeTab === "achievements" && <Achievements />}
        {activeTab === "settings" && <Settings onOpenUserManager={() => setActiveTab("users")} />}
        {activeTab === "users" && <UserManager onBack={() => setActiveTab("dashboard")} />}
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
