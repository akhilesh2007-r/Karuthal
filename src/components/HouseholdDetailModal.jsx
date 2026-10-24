import React, { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Clock,
  Save,
  Check,
} from 'lucide-react';
import {
  calculatePriorityScore,
  formatTimeAgo,
} from '../utils/priority';
import {
  updateHouseholdStatus,
  logHouseholdCheckIn,
  updateHousehold,
} from '../db/db';
import { TRANSLATIONS } from '../utils/translations';

export default function HouseholdDetailModal({
  household,
  onClose,
  onFocusMap,
  lang = 'en',
}) {
  if (!household) return null;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [notes, setNotes] = useState(household.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const { hoursSinceCheckIn } = calculatePriorityScore(household);

  // Status changer handler
  const handleStatusChange = async (newStatus) => {
    await updateHouseholdStatus(household.id, newStatus);
  };

  // Log check-in now
  const handleCheckInNow = async () => {
    await logHouseholdCheckIn(household.id);
  };

  // Save responder notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await updateHousehold(household.id, { notes });
    setIsSavingNotes(false);
    setNotesSavedSuccess(true);
    setTimeout(() => setNotesSavedSuccess(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span>{household.name}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Location & Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
            {household.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <MapPin size={15} color="#0284c7" />
                <span>{household.address}</span>
                <button
                  onClick={() => {
                    onFocusMap(household);
                    onClose();
                  }}
                  style={{
                    color: '#0284c7',
                    textDecoration: 'underline',
                    fontSize: '0.78rem',
                    marginLeft: 'auto',
                    fontWeight: 600,
                  }}
                >
                  {lang === 'ml' ? 'മാപ്പിൽ കാണിക്കുക' : 'Center on Map'}
                </button>
              </div>
            )}
            {household.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Phone size={15} color="#15803d" />
                <span>{household.phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              <Clock size={14} />
              <span>
                {lang === 'ml' ? 'അവസാനം പരിശോധിച്ചത്:' : 'Last Check-In:'} {formatTimeAgo(hoursSinceCheckIn)} ({new Date(household.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
          </div>

          {/* Direct Resident SOS Emergency Alert Box */}
          {household.sosReportedByResident && (
            <div className="resident-sos-alert-box">
              <div className="resident-sos-alert-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulsing-sos-dot"></span>
                  <span className="resident-sos-title">{t.directSosBannerTitle}</span>
                </div>
                {household.sosReportedAt && (
                  <span className="resident-sos-time">
                    {new Date(household.sosReportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="resident-sos-desc">
                {t.directSosBannerDesc}
              </div>
            </div>
          )}


          {/* Needs & Vulnerabilities Badges */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {household.sosReportedByResident ? t.residentConfirmedNeeds : t.allSurveyVulnerabilities}
              </label>
              {household.sosReportedByResident && (
                <span className="tag-resident-reported">
                  ✓ {t.reportedDirectlyByResident}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {household.needs?.bedridden && (
                <span className="tag tag-urgent-flag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                  {lang === 'ml' ? 'കിടപ്പിലായവർ (Stretcher Needed)' : 'Bedridden (Stretcher Needed)'}
                </span>
              )}
              {household.needs?.oxygen && (
                <span className="tag tag-urgent-flag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                  {lang === 'ml' ? 'ഓക്സിജൻ സിലിണ്ടർ (Oxygen Needed)' : 'Oxygen Dependent (Cylinder Needed)'}
                </span>
              )}
              {household.needs?.wheelchair && (
                <span className="tag tag-warning-flag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                  {lang === 'ml' ? 'വീൽചെയർ (Wheelchair Bound)' : 'Wheelchair Bound'}
                </span>
              )}
              {household.needs?.livesAlone && (
                <span className="tag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                  {lang === 'ml' ? 'ഒറ്റയ്ക്കാണ് താമസം (Lives Alone)' : 'Lives Alone'}
                </span>
              )}
              {household.needs?.lowLying && (
                <span className="tag tag-warning-flag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                  {lang === 'ml' ? 'വെള്ളപ്പൊക്ക ഭീഷണി (Flood Zone)' : 'Low-Lying Flood Zone'}
                </span>
              )}
              <span className="tag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                {lang === 'ml' ? `ഗുരുതര രോഗം: ${household.medicalNeed}/3` : `Medical Need: ${household.medicalNeed}/3`}
              </span>
              <span className="tag" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                {lang === 'ml' ? `ചലനശേഷി കുറവ്: ${household.mobility}/3` : `Mobility Impairment: ${household.mobility}/3`}
              </span>
            </div>
          </div>

          {/* Quick Status Setter (Clean text, No Emojis) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">{lang === 'ml' ? 'സ്റ്റാറ്റസ് പുതുക്കുക' : 'Update Status'}</label>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={handleCheckInNow}
                title="Resets time decay score by registering a fresh check-in"
              >
                <Clock size={13} />
                <span>{lang === 'ml' ? 'ഇപ്പോൾ രേഖപ്പെടുത്തുക' : 'Log Check-In Now'}</span>
              </button>
            </div>

            <div className="status-changer-grid">
              <button
                className={`status-btn ${household.status === 'Needs urgent help' ? 'active urgent' : ''}`}
                onClick={() => handleStatusChange('Needs urgent help')}
              >
                <span className="status-dot-indicator dot-urgent"></span>
                <span>{lang === 'ml' ? t.urgentStatus : 'Needs urgent help'}</span>
              </button>

              <button
                className={`status-btn ${household.status === 'Contacted' ? 'active contacted' : ''}`}
                onClick={() => handleStatusChange('Contacted')}
              >
                <span className="status-dot-indicator dot-moderate"></span>
                <span>{lang === 'ml' ? t.contactedStatus : 'Contacted'}</span>
              </button>

              <button
                className={`status-btn ${household.status === 'Visited' ? 'active visited' : ''}`}
                onClick={() => handleStatusChange('Visited')}
              >
                <span className="status-dot-indicator dot-visited"></span>
                <span>{lang === 'ml' ? t.visitedStatus : 'Visited'}</span>
              </button>

              <button
                className={`status-btn ${household.status === 'Evacuated' ? 'active evacuated' : ''}`}
                onClick={() => handleStatusChange('Evacuated')}
              >
                <span className="status-dot-indicator dot-evacuated"></span>
                <span>{lang === 'ml' ? t.evacuatedStatus : 'Evacuated'}</span>
              </button>
            </div>
          </div>

          {/* Responder Emergency Notes */}
          <div className="form-group">
            <label className="form-label">
              {lang === 'ml' ? 'ഫീൽഡ് നിരീക്ഷണങ്ങൾ / കുറിപ്പുകൾ' : 'Field Notes & Volunteer Observations'}
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={
                lang === 'ml'
                  ? 'വെള്ളപ്പൊക്കം, ആരോഗ്യാവസ്ഥ, മരുന്നുകൾ അല്ലെങ്കിൽ രക്ഷാസംഘത്തിന്റെ വിവരങ്ങൾ രേഖപ്പെടുത്തുക...'
                  : 'Record water level observations, medical status, medicine requirements, or rescue team notes...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
              >
                {notesSavedSuccess ? <Check size={14} color="#15803d" /> : <Save size={14} />}
                <span>
                  {notesSavedSuccess
                    ? lang === 'ml'
                      ? 'സൂക്ഷിച്ചു'
                      : 'Saved'
                    : lang === 'ml'
                    ? 'കുറിപ്പ് സൂക്ഷിക്കുക'
                    : 'Save Notes'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {lang === 'ml' ? 'അടയ്ക്കുക' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
