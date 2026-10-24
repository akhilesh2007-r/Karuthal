import React from 'react';
import { Plus, RefreshCw, RotateCcw, MapPin, LogOut, User, Users, Globe } from 'lucide-react';
import { resetToSampleData } from '../db/db';
import { KERALA_DISTRICTS } from '../utils/districts';
import { TRANSLATIONS } from '../utils/translations';

export default function Header({
  onOpenAddModal,
  onRecalculate,
  isRecalculating,
  currentDistrict,
  onChangeDistrict,
  currentUser,
  onLogout,
  lang,
  onToggleLang,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleReset = async () => {
    if (window.confirm(`Reset database to the initial Karuthal sample dataset?`)) {
      await resetToSampleData();
    }
  };

  const isVolunteer = currentUser?.role === 'volunteer';

  return (
    <header className="app-header">
      {/* Left: Brand & District Selector */}
      <div className="brand-section">
        <div className="brand-icon-wrap emoji-logo">
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🙏</span>
        </div>
        <div className="brand-text-col">
          <div className="brand-title-row">
            <span className="brand-title">{t.appTitle}</span>
            {/* Kerala District Selector */}
            <div className="district-select-wrapper">
              <MapPin size={12} className="district-pin-icon" />
              <select
                className="district-select"
                value={currentDistrict}
                onChange={(e) => onChangeDistrict(e.target.value)}
                title="Select Kerala District"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {lang === 'ml' ? d.nameMl : d.name}, {lang === 'ml' ? 'കേരളം' : 'Kerala'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="brand-subtitle">{t.appCaption}</p>
        </div>
      </div>

      {/* Right: Actions, Language Toggle, User Badge & Prominent Sign Out */}
      <div className="header-actions">
        {/* Language Switcher */}
        <button
          className="btn-lang-toggle"
          onClick={onToggleLang}
          title="Switch Language / ഭാഷ മാറ്റുക"
        >
          <Globe size={14} />
          <span>{t.langToggle}</span>
        </button>

        {currentUser && (
          <div className="current-user-badge">
            {isVolunteer ? (
              <Users size={14} color="#0284c7" />
            ) : (
              <User size={14} color="#15803d" />
            )}
            <div className="user-badge-text">
              <span className="user-badge-name">{currentUser.name}</span>
              <span className="user-badge-role">
                {isVolunteer ? (lang === 'ml' ? 'വോളണ്ടിയർ' : 'Volunteer') : (lang === 'ml' ? 'റസിഡന്റ്' : 'Resident')}
              </span>
            </div>
          </div>
        )}

        {isVolunteer && (
          <>
            <button
              className="btn btn-secondary"
              onClick={onRecalculate}
              title="Recalculate check-in decay"
            >
              <RefreshCw size={14} className={isRecalculating ? 'spin-anim' : ''} />
              <span>{t.refresh}</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleReset}
              title="Restore sample households"
            >
              <RotateCcw size={14} />
              <span>{t.reset}</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={onOpenAddModal}
            >
              <Plus size={15} />
              <span>{t.addHousehold}</span>
            </button>
          </>
        )}

        {/* Prominent Sign Out Button */}
        <button
          className="btn btn-signout"
          onClick={onLogout}
          title="Sign out of your account"
        >
          <LogOut size={15} />
          <span>{t.signOut}</span>
        </button>
      </div>
    </header>
  );
}
