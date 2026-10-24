import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDatabase } from './db/db';
import Header from './components/Header';
import MapView from './components/MapView';
import TriageSidebar from './components/TriageSidebar';
import ResidentPortal from './components/ResidentPortal';
import LoginScreen from './components/LoginScreen';
import HouseholdDetailModal from './components/HouseholdDetailModal';
import AddHouseholdModal from './components/AddHouseholdModal';
import { calculatePriorityScore, getPriorityCategory } from './utils/priority';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('disaster_buddy_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Language state ('en' | 'ml')
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('karuthal_lang') || 'en';
  });

  const handleToggleLang = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'ml' : 'en';
      localStorage.setItem('karuthal_lang', next);
      return next;
    });
  };

  const [currentDistrict, setCurrentDistrict] = useState('Wayanad');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [tempCoords, setTempCoords] = useState(null);
  const [tick, setTick] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Initialize DB and sample data
  useEffect(() => {
    initDatabase();
  }, []);

  // Periodic automatic score refresh (every 30 seconds for time decay)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reactive live query from IndexedDB via Dexie
  const households = useLiveQuery(
    async () => {
      return await db.households.toArray();
    },
    [tick]
  ) || [];

  // Filter households by current selected district
  const districtHouseholds = useMemo(() => {
    return households.filter((h) => !h.district || h.district === currentDistrict);
  }, [households, currentDistrict]);

  // Currently selected household object
  const selectedHousehold = useMemo(() => {
    if (!selectedHouseholdId) return null;
    return households.find((h) => h.id === selectedHouseholdId) || null;
  }, [households, selectedHouseholdId]);

  // Aggregate statistics for the current district
  const stats = useMemo(() => {
    let urgent = 0;
    let moderate = 0;
    let low = 0;
    let evacuated = 0;

    districtHouseholds.forEach((h) => {
      const { score } = calculatePriorityScore(h);
      const cat = getPriorityCategory(score, h.status);
      if (cat === 'evacuated') {
        evacuated++;
      } else if (cat === 'urgent') {
        urgent++;
      } else if (cat === 'moderate') {
        moderate++;
      } else {
        low++;
      }
    });

    return {
      total: districtHouseholds.length,
      urgent,
      moderate,
      low,
      evacuated,
    };
  }, [districtHouseholds]);

  // Login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('disaster_buddy_user', JSON.stringify(user));
    if (user.district) {
      setCurrentDistrict(user.district);
    }
    // If resident logs in, automatically default to Malayalam for their comfort
    if (user.role === 'resident') {
      setLang('ml');
      localStorage.setItem('karuthal_lang', 'ml');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('disaster_buddy_user');
  };

  // Manual recalculation trigger
  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTick((prev) => prev + 1);
    setTimeout(() => setIsRecalculating(false), 500);
  };

  // Selection handlers
  const handleSelectHousehold = (household) => {
    setSelectedHouseholdId(household.id);
  };

  const handleOpenDetails = (household) => {
    setSelectedHouseholdId(household.id);
    setIsDetailsModalOpen(true);
  };

  const handleFocusMap = (household) => {
    setSelectedHouseholdId(household.id);
  };

  // Pin drop workflow
  const handleStartPinDrop = () => {
    setIsAddModalOpen(false);
    setIsPinDropMode(true);
  };

  const handleMapClick = (coords) => {
    setTempCoords(coords);
    setIsPinDropMode(false);
    setIsAddModalOpen(true);
  };

  const handleCancelPinDrop = () => {
    setIsPinDropMode(false);
    setIsAddModalOpen(true);
  };

  // If user is not signed in, show Gatekeeper Login Screen with language switcher
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        households={households}
        lang={lang}
        onToggleLang={handleToggleLang}
      />
    );
  }

  const isVolunteer = currentUser.role === 'volunteer';

  return (
    <div className="app-container">
      <Header
        onOpenAddModal={() => {
          setTempCoords(null);
          setIsAddModalOpen(true);
        }}
        onRecalculate={handleRecalculate}
        isRecalculating={isRecalculating}
        currentDistrict={currentDistrict}
        onChangeDistrict={setCurrentDistrict}
        currentUser={currentUser}
        onLogout={handleLogout}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      <main className="app-main">
        {/* Conditional Sidebar: Triage Priority Queue for Volunteers, Help Desk for Residents */}
        {isVolunteer ? (
          <TriageSidebar
            households={households}
            selectedHousehold={selectedHousehold}
            onSelectHousehold={handleSelectHousehold}
            onOpenDetails={handleOpenDetails}
            currentDistrict={currentDistrict}
            lang={lang}
          />
        ) : (
          <ResidentPortal
            currentUser={currentUser}
            households={districtHouseholds}
            currentDistrict={currentDistrict}
            lang={lang}
          />
        )}

        <MapView
          households={households}
          selectedHousehold={selectedHousehold}
          onSelectHousehold={handleSelectHousehold}
          onOpenDetails={handleOpenDetails}
          isPinDropMode={isPinDropMode}
          tempCoords={tempCoords}
          onMapClick={handleMapClick}
          onCancelPinDrop={handleCancelPinDrop}
          currentDistrict={currentDistrict}
          currentRole={currentUser.role}
          currentUser={currentUser}
          stats={stats}
          lang={lang}
        />
      </main>

      {/* Household Detail Modal (Volunteer update tool) */}
      {isDetailsModalOpen && selectedHousehold && isVolunteer && (
        <HouseholdDetailModal
          household={selectedHousehold}
          onClose={() => setIsDetailsModalOpen(false)}
          onFocusMap={handleFocusMap}
          lang={lang}
        />
      )}

      {/* Add Household Modal */}
      <AddHouseholdModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setTempCoords(null);
        }}
        tempCoords={tempCoords}
        onStartPinDrop={handleStartPinDrop}
        currentDistrict={currentDistrict}
      />
    </div>
  );
}
