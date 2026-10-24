import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Phone,
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  X,
  ShieldCheck,
  Check,
  Square,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { residentTriggerSOS, residentReportSafe } from '../db/db';
import { formatTimeAgo, calculatePriorityScore } from '../utils/priority';
import { TRANSLATIONS } from '../utils/translations';
import { getEmergencyServicesByDistrict } from '../utils/emergencyServices';

export default function ResidentPortal({
  currentUser,
  households,
  currentDistrict,
  lang,
}) {
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isHelpComingOpen, setIsHelpComingOpen] = useState(false);
  const [safeSent, setSafeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Retrieve special care vehicles and travel operators for the active district
  const { specialCareVehicles } = useMemo(() => {
    return getEmergencyServicesByDistrict(currentDistrict);
  }, [currentDistrict]);

  // Find logged-in resident's specific household record
  const myHousehold = households.find((h) => h.id === currentUser?.householdId) || currentUser?.household || households[0];

  // Local state for Identified Vulnerabilities
  const [localNeeds, setLocalNeeds] = useState({
    bedridden: false,
    oxygen: false,
    wheelchair: false,
    livesAlone: false,
    lowLying: false,
  });
  const [localMedicalNeed, setLocalMedicalNeed] = useState(false);
  const [localMobility, setLocalMobility] = useState(false);

  // Sync with household needs whenever modal opens or household updates
  useEffect(() => {
    if (myHousehold) {
      setLocalNeeds({
        bedridden: Boolean(myHousehold.needs?.bedridden),
        oxygen: Boolean(myHousehold.needs?.oxygen),
        wheelchair: Boolean(myHousehold.needs?.wheelchair),
        livesAlone: Boolean(myHousehold.needs?.livesAlone),
        lowLying: Boolean(myHousehold.needs?.lowLying),
      });
      setLocalMedicalNeed((Number(myHousehold.medicalNeed) || 0) >= 2);
      setLocalMobility((Number(myHousehold.mobility) || 0) >= 2);
    }
  }, [myHousehold, isSosModalOpen]);

  // Toggle need
  const toggleNeed = (key) => {
    setLocalNeeds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Option 1: Quick / Instant SOS trigger
  const handleQuickSOS = async () => {
    if (!myHousehold) return;
    setIsSubmitting(true);
    try {
      await residentTriggerSOS(myHousehold.id);
      setIsSosModalOpen(false);
      setIsHelpComingOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option 2: SOS with client-selected Identified Vulnerabilities
  const handleDetailedSOS = async () => {
    if (!myHousehold) return;
    setIsSubmitting(true);
    try {
      const vulnerabilities = {
        needs: localNeeds,
        medicalNeed: localMedicalNeed ? 3 : 1,
        mobility: localMobility ? 3 : 1,
      };
      await residentTriggerSOS(myHousehold.id, vulnerabilities);
      setIsSosModalOpen(false);
      setIsHelpComingOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Safe
  const handleSafe = async () => {
    if (!myHousehold) return;
    await residentReportSafe(myHousehold.id);
    setSafeSent(true);
    setTimeout(() => setSafeSent(false), 5000);
  };

  // Helper to translate status
  const getStatusText = (status) => {
    if (lang === 'ml') {
      if (status === 'Needs urgent help') return t.urgentStatus;
      if (status === 'Contacted') return t.contactedStatus;
      if (status === 'Visited') return t.visitedStatus;
      if (status === 'Evacuated') return t.evacuatedStatus;
    }
    return status;
  };

  return (
    <aside className="resident-portal-sidebar">
      <div className="resident-portal-header">
        <h2 className="resident-portal-title">{t.helpDeskTitle}</h2>
        <p className="resident-portal-subtitle">
          {t.signedInAs} <strong>{currentUser?.name}</strong> ({t.districts?.[currentDistrict] || currentDistrict}, {t.districts?.kerala || 'Kerala'})
        </p>
      </div>

      <div className="resident-portal-body">
        {/* Current status display card for this resident only */}
        {myHousehold ? (
          <div className="resident-status-card">
            <div className="resident-card-header">
              <span className="resident-status-label">{t.myStatus}</span>
              <span className={`status-badge ${
                myHousehold.status === 'Needs urgent help'
                  ? 'urgent'
                  : myHousehold.status.toLowerCase()
              }`}>
                {getStatusText(myHousehold.status)}
              </span>
            </div>

            <div className="resident-household-name">{myHousehold.name}</div>
            <div className="resident-household-addr">
              <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              {myHousehold.address || `${t.districts?.[currentDistrict] || currentDistrict}, ${t.districts?.kerala || 'Kerala'}`}
            </div>

            <div className="resident-checkin-time">
              <Clock size={13} />
              <span>{t.lastChecked} {formatTimeAgo(calculatePriorityScore(myHousehold).hoursSinceCheckIn, lang)}</span>
            </div>

            {safeSent && (
              <div className="resident-alert-msg safe">
                {t.safeSuccessAlert}
              </div>
            )}
          </div>
        ) : (
          <div className="resident-status-card">
            <p>Welcome, {currentUser?.name}.</p>
          </div>
        )}

        {/* Big Accessible Action Buttons for Seniors */}
        <div className="resident-actions-group">
          {/* Clicking SOS opens the two-option dialog */}
          <button
            className="resident-big-btn btn-sos"
            onClick={() => setIsSosModalOpen(true)}
          >
            <AlertTriangle size={28} />
            <div className="resident-btn-text">
              <strong>{t.sosBtnTitle}</strong>
              <span>{t.sosBtnDesc}</span>
            </div>
          </button>

          <button
            className="resident-big-btn btn-safe"
            onClick={handleSafe}
          >
            <CheckCircle2 size={28} />
            <div className="resident-btn-text">
              <strong>{t.safeBtnTitle}</strong>
              <span>{t.safeBtnDesc}</span>
            </div>
          </button>
        </div>

        {/* Emergency Helplines (Kerala) */}
        <div className="helpline-box">
          <div className="helpline-title">
            <Phone size={14} />
            <span>{t.helplinesTitle}</span>
          </div>
          <div className="helpline-grid">
            <div className="helpline-item">
              <span className="helpline-name">{t.controlRoom}</span>
              <a href="tel:1077" className="helpline-num">1077</a>
            </div>
            <div className="helpline-item">
              <span className="helpline-name">{t.police}</span>
              <a href="tel:112" className="helpline-num">112</a>
            </div>
            <div className="helpline-item">
              <span className="helpline-name">{t.ambulance}</span>
              <a href="tel:108" className="helpline-num">108</a>
            </div>
            <div className="helpline-item">
              <span className="helpline-name">{t.fireRescue}</span>
              <a href="tel:101" className="helpline-num">101</a>
            </div>
          </div>
        </div>

        {/* Special Care Vehicles & Emergency Evacuation Transport */}
        <div className="special-care-section">
          <div className="special-care-header">
            <div className="special-care-title-wrap">
              <Truck size={15} color="#0284c7" />
              <span className="special-care-title">{t.specialVehiclesTitle}</span>
            </div>
            <span className="special-care-badge">
              {t.districts?.[currentDistrict] || currentDistrict}
            </span>
          </div>
          <p className="special-care-subtitle">{t.specialVehiclesDesc}</p>

          <div className="special-care-list">
            {specialCareVehicles && specialCareVehicles.length > 0 ? (
              specialCareVehicles.map((veh) => (
                <div key={veh.id} className="special-care-card">
                  <div className="special-care-main">
                    <div className="special-care-info">
                      <span className="special-care-name">
                        {lang === 'ml' && veh.nameMl ? veh.nameMl : veh.name}
                      </span>
                      <span className="special-care-type">
                        {lang === 'ml' && veh.typeMl ? veh.typeMl : veh.type}
                      </span>
                    </div>
                    <a
                      href={`tel:${veh.phone.replace(/[^0-9+]/g, '')}`}
                      className="btn-call-vehicle"
                      title={`Call ${veh.name}`}
                    >
                      <Phone size={12} />
                      <span>{t.callNow}</span>
                    </a>
                  </div>

                  <div className="special-care-meta">
                    <span className="special-care-feature-tag">
                      {lang === 'ml' && veh.featuresMl ? veh.featuresMl : veh.features}
                    </span>
                    <span className="special-care-phone-text">{veh.phone}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                No registered special care vehicles in this area.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SOS Emergency Dialog (Instant SOS vs Vulnerabilities)  */}
      {/* ========================================================= */}
      {isSosModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSosModalOpen(false)}>
          <div
            className="modal-content sos-choice-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header sos-modal-header">
              <div className="modal-title">
                <AlertTriangle size={20} color="#dc2626" />
                <span>{t.sosDialogTitle}</span>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsSosModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body sos-modal-body">
              <p className="sos-modal-intro">{t.sosDialogSubtitle}</p>

              {/* Option 1: Quick / Instant Emergency SOS */}
              <div className="sos-option-panel instant-panel">
                <div className="sos-option-label-row">
                  <span className="sos-option-badge urgent">
                    {lang === 'ml' ? 'ഓപ്ഷൻ 1: സമയം കുറവെങ്കിൽ' : 'OPTION 1: CRITICAL / SHORT TIME'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-instant-emergency"
                  onClick={handleQuickSOS}
                  disabled={isSubmitting}
                >
                  <AlertTriangle size={26} />
                  <div className="btn-instant-text">
                    <strong>{t.quickSosBtnTitle}</strong>
                    <span>{t.quickSosBtnDesc}</span>
                  </div>
                </button>
              </div>

              {/* Visual Divider */}
              <div className="sos-divider">
                <span>{lang === 'ml' ? 'അല്ലെങ്കിൽ ആവശ്യങ്ങൾ തിരഞ്ഞെടുക്കുക' : 'OR SPECIFY IDENTIFIED VULNERABILITIES'}</span>
              </div>

              {/* Option 2: Identified Vulnerabilities Selection */}
              <div className="sos-option-panel vulnerabilities-panel">
                <div className="sos-option-label-row">
                  <span className="sos-option-badge info">
                    {lang === 'ml' ? 'ഓപ്ഷൻ 2: ആരോഗ്യ & പ്രത്യേക ആവശ്യങ്ങൾ' : 'OPTION 2: SPECIFIC ASSISTANCE REQUIRED'}
                  </span>
                </div>
                <h4 className="sos-vuln-title">{t.vulnerabilitiesTitle}</h4>
                <p className="sos-vuln-desc">{t.vulnerabilitiesSubtitle}</p>

                <div className="sos-vulnerabilities-grid">
                  {/* Bedridden */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localNeeds.bedridden ? 'selected' : ''}`}
                    onClick={() => toggleNeed('bedridden')}
                  >
                    <div className="vuln-checkbox">
                      {localNeeds.bedridden ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnBedridden}</span>
                  </button>

                  {/* Oxygen Dependent */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localNeeds.oxygen ? 'selected' : ''}`}
                    onClick={() => toggleNeed('oxygen')}
                  >
                    <div className="vuln-checkbox">
                      {localNeeds.oxygen ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnOxygen}</span>
                  </button>

                  {/* Wheelchair Bound */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localNeeds.wheelchair ? 'selected' : ''}`}
                    onClick={() => toggleNeed('wheelchair')}
                  >
                    <div className="vuln-checkbox">
                      {localNeeds.wheelchair ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnWheelchair}</span>
                  </button>

                  {/* Lives Alone */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localNeeds.livesAlone ? 'selected' : ''}`}
                    onClick={() => toggleNeed('livesAlone')}
                  >
                    <div className="vuln-checkbox">
                      {localNeeds.livesAlone ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnLivesAlone}</span>
                  </button>

                  {/* Low-Lying Flood Zone */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localNeeds.lowLying ? 'selected' : ''}`}
                    onClick={() => toggleNeed('lowLying')}
                  >
                    <div className="vuln-checkbox">
                      {localNeeds.lowLying ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnLowLying}</span>
                  </button>

                  {/* High Medical Need */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localMedicalNeed ? 'selected' : ''}`}
                    onClick={() => setLocalMedicalNeed((prev) => !prev)}
                  >
                    <div className="vuln-checkbox">
                      {localMedicalNeed ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnMedicalNeed}</span>
                  </button>

                  {/* Mobility Impairment */}
                  <button
                    type="button"
                    className={`vuln-toggle-card ${localMobility ? 'selected' : ''}`}
                    onClick={() => setLocalMobility((prev) => !prev)}
                  >
                    <div className="vuln-checkbox">
                      {localMobility ? <Check size={16} /> : <Square size={16} />}
                    </div>
                    <span className="vuln-label">{t.vulnMobility}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-send-detailed-sos"
                  onClick={handleDetailedSOS}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 size={18} />
                  <span>{t.sendDetailedSosBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. "The Help is Coming" Popup Modal                       */}
      {/* ========================================================= */}
      {isHelpComingOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpComingOpen(false)}>
          <div
            className="modal-content help-coming-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-coming-header">
              <div className="help-coming-icon-wrap">
                <span style={{ fontSize: '32px', lineHeight: 1 }}>🙏</span>
              </div>
              <h2 className="help-coming-title">{t.helpComingTitle}</h2>
              <p className="help-coming-subtitle">{t.helpComingSubtitle}</p>
            </div>

            <div className="help-coming-body">
              <div className="help-coming-alert-card">
                <ShieldCheck size={24} color="#15803d" />
                <p>{t.helpComingInstruction}</p>
              </div>

              <div className="help-coming-helpline-box">
                <span className="help-coming-helpline-heading">
                  {t.helpComingHelplines}
                </span>
                <div className="help-coming-helpline-grid">
                  <a href="tel:1077" className="help-coming-num-chip">
                    <span>1077</span>
                    <small>{t.controlRoom}</small>
                  </a>
                  <a href="tel:112" className="help-coming-num-chip">
                    <span>112</span>
                    <small>{t.police}</small>
                  </a>
                  <a href="tel:108" className="help-coming-num-chip">
                    <span>108</span>
                    <small>{t.ambulance}</small>
                  </a>
                  <a href="tel:101" className="help-coming-num-chip">
                    <span>101</span>
                    <small>{t.fireRescue}</small>
                  </a>
                </div>
              </div>

              <button
                type="button"
                className="btn-help-coming-ok"
                onClick={() => setIsHelpComingOpen(false)}
              >
                <span>{t.helpComingOkBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
