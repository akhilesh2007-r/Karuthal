import React, { useState, useMemo } from 'react';
import { Search, ListFilter, Clock, PhoneCall, Phone, MapPin, Truck, ChevronRight } from 'lucide-react';
import { calculatePriorityScore, getPriorityCategory, formatTimeAgo } from '../utils/priority';
import { TRANSLATIONS } from '../utils/translations';
import { getEmergencyServicesByDistrict } from '../utils/emergencyServices';

export default function TriageSidebar({
  households,
  selectedHousehold,
  onSelectHousehold,
  onOpenDetails,
  currentDistrict,
  lang = 'en',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [mainTab, setMainTab] = useState('QUEUE'); // 'QUEUE' | 'CALL_SERVICES'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('URGENT');
  const [sortBy, setSortBy] = useState('PRIORITY_DESC');

  // Call services state
  const [callCategory, setCallCategory] = useState('ALL');
  const [callSearch, setCallSearch] = useState('');

  // Retrieve comprehensive emergency callable services
  const { hospitals, clinics = [], fireForce, specialCareVehicles = [] } = useMemo(() => {
    return getEmergencyServicesByDistrict(currentDistrict);
  }, [currentDistrict]);

  const allCallableServices = useMemo(() => {
    return [
      ...hospitals.map((h) => ({
        ...h,
        categoryKey: 'HOSPITAL',
        categoryLabel: lang === 'ml' ? 'ആശുപത്രി (H)' : 'Hospital (H)',
      })),
      ...clinics.map((c) => ({
        ...c,
        categoryKey: 'CLINIC',
        categoryLabel: lang === 'ml' ? 'ക്ലിനിക്ക് (C)' : 'Clinic / PHC (C)',
      })),
      ...fireForce.map((f) => ({
        ...f,
        categoryKey: 'FIRE',
        categoryLabel: lang === 'ml' ? 'ഫയർ ഫോഴ്സ് (F)' : 'Fire & Rescue (F)',
      })),
      ...specialCareVehicles.map((v) => ({
        ...v,
        categoryKey: 'TRAVEL',
        categoryLabel: lang === 'ml' ? 'യാത്ര / 4x4' : 'Travel / 4x4',
      })),
    ];
  }, [hospitals, clinics, fireForce, specialCareVehicles, lang]);

  const filteredServices = useMemo(() => {
    return allCallableServices.filter((svc) => {
      if (callCategory !== 'ALL' && svc.categoryKey !== callCategory) return false;
      if (callSearch.trim()) {
        const q = callSearch.toLowerCase();
        const matchName = svc.name.toLowerCase().includes(q) || (svc.nameMl && svc.nameMl.toLowerCase().includes(q));
        const matchLoc = svc.locality && svc.locality.toLowerCase().includes(q);
        const matchPhone = svc.phone && svc.phone.includes(q);
        const matchFeat = (svc.beds && svc.beds.toLowerCase().includes(q)) ||
                          (svc.features && svc.features.toLowerCase().includes(q)) ||
                          (svc.equipment && svc.equipment.toLowerCase().includes(q));
        if (!matchName && !matchLoc && !matchPhone && !matchFeat) return false;
      }
      return true;
    });
  }, [allCallableServices, callCategory, callSearch]);

  // Filter households by current district first
  const districtHouseholds = useMemo(() => {
    return households.filter((h) => !h.district || h.district === currentDistrict);
  }, [households, currentDistrict]);

  // Compute scores and decorate households (used for backend sorting only)
  const scoredHouseholds = useMemo(() => {
    return districtHouseholds.map((h) => {
      const { score, hoursSinceCheckIn, breakdown } = calculatePriorityScore(h);
      const category = getPriorityCategory(score, h.status);
      return {
        ...h,
        priorityScore: score,
        hoursSinceCheckIn,
        scoreBreakdown: breakdown,
        category,
      };
    });
  }, [districtHouseholds]);

  // Filter and sort (priority sorting active in backend)
  const filteredHouseholds = useMemo(() => {
    return scoredHouseholds
      .filter((h) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = h.name.toLowerCase().includes(q);
          const matchAddr = h.address && h.address.toLowerCase().includes(q);
          if (!matchName && !matchAddr) return false;
        }

        // Status filter
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'URGENT') return h.sosReportedByResident || h.status === 'Needs urgent help';
        if (filterStatus === 'CONTACTED') return h.status === 'Contacted';
        if (filterStatus === 'VISITED') return h.status === 'Visited';
        if (filterStatus === 'EVACUATED') return h.status === 'Evacuated';
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'PRIORITY_DESC') {
          return b.priorityScore - a.priorityScore;
        }
        if (sortBy === 'PRIORITY_ASC') {
          return a.priorityScore - b.priorityScore;
        }
        if (sortBy === 'CHECKIN_OLDEST') {
          return b.hoursSinceCheckIn - a.hoursSinceCheckIn;
        }
        if (sortBy === 'NAME_ASC') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [scoredHouseholds, searchQuery, filterStatus, sortBy]);

  const activeSosCount = useMemo(() => {
    return districtHouseholds.filter((h) => h.sosReportedByResident || h.status === 'Needs urgent help').length;
  }, [districtHouseholds]);

  return (
    <aside className="triage-sidebar">
      {/* Top Main Mode Navigation Tabs: Triage Queue vs Call Services */}
      <div className="sidebar-main-tabs">
        <button
          className={`sidebar-nav-tab ${mainTab === 'QUEUE' ? 'active' : ''}`}
          onClick={() => setMainTab('QUEUE')}
        >
          <ListFilter size={15} />
          <span>{lang === 'ml' ? 'രക്ഷാ നിര' : 'Triage Queue'}</span>
          {activeSosCount > 0 ? (
            <span className="tab-pill-badge urgent">{activeSosCount}</span>
          ) : (
            <span className="tab-pill-badge neutral">0</span>
          )}
        </button>
        <button
          className={`sidebar-nav-tab ${mainTab === 'CALL_SERVICES' ? 'active' : ''}`}
          onClick={() => setMainTab('CALL_SERVICES')}
        >
          <PhoneCall size={15} />
          <span>{lang === 'ml' ? 'സേവനങ്ങളെ വിളിക്കുക' : 'Call Services'}</span>
          <span className="tab-pill-badge highlight">{allCallableServices.length}</span>
        </button>
      </div>

      {mainTab === 'QUEUE' ? (
        <>
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <div className="sidebar-title">
                <ListFilter size={16} />
                <span>{lang === 'ml' ? `അടിയന്തര രക്ഷാ നിര (${currentDistrict})` : `Triage Queue (${currentDistrict})`}</span>
              </div>
              <span className="sidebar-count-badge">
                {filteredHouseholds.length} {lang === 'ml' ? 'സന്ദേശങ്ങൾ' : 'alerts'}
              </span>
            </div>

            {/* Search */}
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={lang === 'ml' ? 'പേര് അല്ലെങ്കിൽ വിലാസം തിരയുക...' : 'Search by name, house, or road...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Clean Filter chips */}
            <div className="filter-chips">
              <button
                className={`filter-chip ${filterStatus === 'URGENT' ? 'active' : ''}`}
                onClick={() => setFilterStatus('URGENT')}
              >
                {lang === 'ml' ? `അടിയന്തിരം / SOS (${activeSosCount})` : `Active SOS (${activeSosCount})`}
              </button>
              <button
                className={`filter-chip ${filterStatus === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterStatus('ALL')}
              >
                {lang === 'ml' ? `ആകെ (${districtHouseholds.length})` : `All (${districtHouseholds.length})`}
              </button>
              <button
                className={`filter-chip ${filterStatus === 'CONTACTED' ? 'active' : ''}`}
                onClick={() => setFilterStatus('CONTACTED')}
              >
                {lang === 'ml' ? 'ബന്ധപ്പെട്ടവർ' : 'Contacted'}
              </button>
              <button
                className={`filter-chip ${filterStatus === 'VISITED' ? 'active' : ''}`}
                onClick={() => setFilterStatus('VISITED')}
              >
                {lang === 'ml' ? 'സന്ദർശിച്ചവർ' : 'Visited'}
              </button>
            </div>
          </div>

          {/* Sort options bar */}
          <div className="sort-bar">
            <span>{lang === 'ml' ? 'ക്രമം:' : 'Sort by:'}</span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="PRIORITY_DESC">{lang === 'ml' ? 'മുൻഗണനാ ക്രമം (കൂടിയത് ആദ്യം)' : 'Highest Priority First'}</option>
              <option value="CHECKIN_OLDEST">{lang === 'ml' ? 'കൂടുതൽ സമയം പരിശോധിക്കാത്തവ' : 'Longest Without Check-in'}</option>
              <option value="PRIORITY_ASC">{lang === 'ml' ? 'മുൻഗണനാ ക്രമം (കുറഞ്ഞത് ആദ്യം)' : 'Lowest Priority First'}</option>
              <option value="NAME_ASC">{lang === 'ml' ? 'പേര് (A to Z)' : 'Name (A to Z)'}</option>
            </select>
          </div>

          {/* Cards list */}
          <div className="cards-scroll-area">
            {filteredHouseholds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {lang === 'ml' ? 'നിലവിൽ അടിയന്തര രക്ഷാ സന്ദേശങ്ങളൊന്നുമില്ല.' : `No emergency SOS alerts in ${currentDistrict}.`}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {lang === 'ml' ? 'റസിഡന്റ് SOS അയക്കുമ്പോൾ ഇവിടെ ഉടൻ ലഭ്യമാകും.' : 'Resident emergency requests will appear here live.'}
                </span>
              </div>
            ) : (
              filteredHouseholds.map((household) => {
                const isSelected = selectedHousehold?.id === household.id;
                const isResidentSos = Boolean(household.sosReportedByResident);

                return (
                  <div
                    key={household.id}
                    className={`household-card ${isSelected ? 'selected' : ''} ${
                      isResidentSos ? 'household-card-resident-sos' : ''
                    }`}
                    onClick={() => {
                      onSelectHousehold(household);
                      onOpenDetails(household);
                    }}
                  >
                    <div className="card-top-row">
                      <div>
                        <div className="card-name">{household.name}</div>
                        {household.address && (
                          <div className="card-address">
                            {household.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Direct Resident SOS Highlight Badge */}
                    {isResidentSos && (
                      <div className="resident-sos-card-pill">
                        <span className="pulsing-sos-dot"></span>
                        <span className="resident-sos-pill-text">{t.directSosBadge}</span>
                        {household.sosReportedAt && (
                          <span className="resident-sos-pill-time">
                            {new Date(household.sosReportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Specific needs tags */}
                    <div className="card-tags">
                      {household.needs?.bedridden && (
                        <span className="tag tag-urgent-flag">
                          {lang === 'ml' ? 'കിടപ്പിലായവർ' : 'Bedridden'}
                        </span>
                      )}
                      {household.needs?.oxygen && (
                        <span className="tag tag-urgent-flag">
                          {lang === 'ml' ? 'ഓക്സിജൻ' : 'Oxygen'}
                        </span>
                      )}
                      {household.needs?.wheelchair && (
                        <span className="tag tag-warning-flag">
                          {lang === 'ml' ? 'വീൽചെയർ' : 'Wheelchair'}
                        </span>
                      )}
                      {household.needs?.livesAlone && (
                        <span className="tag">
                          {lang === 'ml' ? 'ഒറ്റയ്ക്ക്' : 'Lives Alone'}
                        </span>
                      )}
                      {household.needs?.lowLying && (
                        <span className="tag tag-warning-flag">
                          {lang === 'ml' ? 'വെള്ളപ്പൊക്കം' : 'Flood Zone'}
                        </span>
                      )}
                      {household.medicalNeed > 0 && (
                        <span className="tag">
                          {lang === 'ml' ? `മരുന്ന്: ${household.medicalNeed}/3` : `Med: ${household.medicalNeed}/3`}
                        </span>
                      )}
                      {household.mobility > 0 && (
                        <span className="tag">
                          {lang === 'ml' ? `ചലനശേഷി: ${household.mobility}/3` : `Mobility: ${household.mobility}/3`}
                        </span>
                      )}
                    </div>

                    <div className="card-footer">
                      <span
                        className={`status-badge ${
                          household.status === 'Needs urgent help'
                            ? 'urgent'
                            : household.status.toLowerCase()
                        }`}
                      >
                        {lang === 'ml'
                          ? household.status === 'Needs urgent help'
                            ? t.urgentStatus
                            : household.status === 'Contacted'
                            ? t.contactedStatus
                            : household.status === 'Visited'
                            ? t.visitedStatus
                            : household.status === 'Evacuated'
                            ? t.evacuatedStatus
                            : household.status
                          : household.status}
                      </span>

                      <span className="time-ago">
                        <Clock size={12} />
                        {formatTimeAgo(household.hoursSinceCheckIn)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Quick-Call Service Bar at bottom of Left Sidebar */}
          <div className="sidebar-bottom-call-banner" onClick={() => setMainTab('CALL_SERVICES')}>
            <div className="sb-call-banner-left">
              <div className="sb-call-icon-circle">
                <PhoneCall size={15} />
              </div>
              <div className="sb-call-banner-copy">
                <strong>{lang === 'ml' ? 'സേവനങ്ങളെ വിളിക്കുക' : 'Call Emergency Services'}</strong>
                <span>{lang === 'ml' ? 'ആശുപത്രി, ക്ലിനിക്ക്, ഫയർ, യാത്ര (24)' : 'Hospitals, Clinics, Fire, Travel (24)'}</span>
              </div>
            </div>
            <span className="sb-call-banner-action">
              <span>{lang === 'ml' ? 'തുറക്കുക' : 'Open'}</span>
              <ChevronRight size={14} />
            </span>
          </div>
        </>
      ) : (
        /* CALL SERVICES TAB VIEW */
        <div className="sidebar-call-services-view">
          <div className="sidebar-header cs-header">
            <div className="sidebar-title-row">
              <div className="sidebar-title">
                <PhoneCall size={16} />
                <span>{lang === 'ml' ? `അടിയന്തര സേവനങ്ങൾ (${currentDistrict})` : `Call Services (${currentDistrict})`}</span>
              </div>
              <span className="sidebar-count-badge highlight">
                {filteredServices.length} {lang === 'ml' ? 'സേവനങ്ങൾ' : 'contacts'}
              </span>
            </div>

            <p className="cs-sidebar-intro">
              {lang === 'ml'
                ? 'വ്യക്തികൾക്ക് ആവശ്യമുള്ളപ്പോൾ ആശുപത്രികൾ, ക്ലിനിക്കുകൾ, ഫയർ ഫോഴ്സ്, യാത്രാ വാഹനങ്ങൾ എന്നിവരെ നേരിട്ട് വിളിക്കാം'
                : 'Direct calling options for hospitals, clinics, fire force & travel rescue vehicles when a person needs help.'}
            </p>

            {/* Quick State Helplines Strip */}
            <div className="cs-state-helpline-grid">
              <a href="tel:1077" className="cs-helpline-chip">
                <span className="hl-label">{lang === 'ml' ? 'കൺട്രോൾ റൂം' : 'Disaster'}</span>
                <span className="hl-number">1077</span>
              </a>
              <a href="tel:108" className="cs-helpline-chip">
                <span className="hl-label">{lang === 'ml' ? 'ആംബുലൻസ്' : 'Ambulance'}</span>
                <span className="hl-number">108</span>
              </a>
              <a href="tel:101" className="cs-helpline-chip">
                <span className="hl-label">{lang === 'ml' ? 'ഫയർ & റെസ്ക്യൂ' : 'Fire'}</span>
                <span className="hl-number">101</span>
              </a>
              <a href="tel:112" className="cs-helpline-chip">
                <span className="hl-label">{lang === 'ml' ? 'പോലീസ്' : 'Police'}</span>
                <span className="hl-number">112</span>
              </a>
            </div>

            {/* Search */}
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={lang === 'ml' ? 'സേവനം, സ്ഥലം, ഫോൺ നമ്പർ തിരയുക...' : 'Search hospital, clinic, 4x4, boat, area...'}
                value={callSearch}
                onChange={(e) => setCallSearch(e.target.value)}
              />
            </div>

            {/* Filter chips */}
            <div className="filter-chips cs-chips">
              <button
                className={`filter-chip ${callCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setCallCategory('ALL')}
              >
                {lang === 'ml' ? 'എല്ലാം' : 'All'} ({allCallableServices.length})
              </button>
              <button
                className={`filter-chip ${callCategory === 'HOSPITAL' ? 'active' : ''}`}
                onClick={() => setCallCategory('HOSPITAL')}
              >
                {lang === 'ml' ? 'ആശുപത്രി' : 'Hospitals'} ({hospitals.length})
              </button>
              <button
                className={`filter-chip ${callCategory === 'CLINIC' ? 'active' : ''}`}
                onClick={() => setCallCategory('CLINIC')}
              >
                {lang === 'ml' ? 'ക്ലിനിക്ക്' : 'Clinics'} ({clinics.length})
              </button>
              <button
                className={`filter-chip ${callCategory === 'FIRE' ? 'active' : ''}`}
                onClick={() => setCallCategory('FIRE')}
              >
                {lang === 'ml' ? 'ഫയർ ഫോഴ്സ്' : 'Fire Force'} ({fireForce.length})
              </button>
              <button
                className={`filter-chip ${callCategory === 'TRAVEL' ? 'active' : ''}`}
                onClick={() => setCallCategory('TRAVEL')}
              >
                {lang === 'ml' ? 'യാത്ര / 4x4' : 'Travel / 4x4'} ({specialCareVehicles.length})
              </button>
            </div>
          </div>

          {/* Callable Services List */}
          <div className="cards-scroll-area cs-scroll-area">
            {filteredServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {lang === 'ml' ? 'സേവനങ്ങളൊന്നും കണ്ടെത്താനായില്ല.' : 'No emergency services matched your filter.'}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {lang === 'ml' ? 'തിരയൽ പദം മാറ്റി നോക്കുക.' : 'Try a different search query or category filter.'}
                </span>
              </div>
            ) : (
              filteredServices.map((svc) => {
                const callHref = `tel:${(svc.phone || '').replace(/[^0-9+]/g, '')}`;
                const altCallHref = svc.altPhone ? `tel:${svc.altPhone.replace(/[^0-9+]/g, '')}` : null;

                return (
                  <div key={svc.id} className={`cs-sidebar-card cat-${svc.categoryKey.toLowerCase()}`}>
                    <div className="cs-sidebar-card-top">
                      <span className={`cs-badge cat-${svc.categoryKey.toLowerCase()}`}>
                        {svc.categoryLabel}
                      </span>
                      {svc.locality && (
                        <span className="cs-sidebar-card-loc">
                          <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                          {svc.locality}
                        </span>
                      )}
                    </div>

                    <div className="cs-sidebar-card-title">
                      {lang === 'ml' && svc.nameMl ? svc.nameMl : svc.name}
                    </div>

                    <div className="cs-sidebar-card-details">
                      {svc.beds && (
                        <div className="cs-detail-item">
                          <strong>{lang === 'ml' ? 'ചികിത്സ:' : 'Care:'}</strong>{' '}
                          {lang === 'ml' && svc.bedsMl ? svc.bedsMl : svc.beds}
                        </div>
                      )}
                      {svc.features && (
                        <div className="cs-detail-item">
                          <strong>{lang === 'ml' ? 'സൗകര്യം:' : 'Equip:'}</strong>{' '}
                          {lang === 'ml' && svc.featuresMl ? svc.featuresMl : svc.features}
                        </div>
                      )}
                      {svc.equipment && (
                        <div className="cs-detail-item">
                          <strong>{lang === 'ml' ? 'ഉപകരണങ്ങൾ:' : 'Rescue Gear:'}</strong>{' '}
                          {lang === 'ml' && svc.equipmentMl ? svc.equipmentMl : svc.equipment}
                        </div>
                      )}
                    </div>

                    <div className="cs-sidebar-card-actions">
                      <a href={callHref} className="btn-cs-dial primary">
                        <Phone size={13} />
                        <span>{lang === 'ml' ? 'വിളിക്കുക:' : 'Call:'} {svc.phone}</span>
                      </a>
                      {altCallHref && (
                        <a href={altCallHref} className="btn-cs-dial secondary">
                          <Phone size={12} />
                          <span>{svc.altPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
