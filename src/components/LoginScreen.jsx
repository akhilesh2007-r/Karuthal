import React, { useState } from 'react';
import { Users, User, Lock, Calendar, AlertCircle, ArrowRight, Globe } from 'lucide-react';
import { verifyVolunteer, verifyIndividual } from '../utils/auth';
import { TRANSLATIONS } from '../utils/translations';

export default function LoginScreen({ onLogin, households, lang, onToggleLang }) {
  const [selectedRole, setSelectedRole] = useState('volunteer'); // 'volunteer' | 'resident'

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Form inputs
  const [volunteerUsername, setVolunteerUsername] = useState('');
  const [volunteerPassword, setVolunteerPassword] = useState('');

  const [residentName, setResidentName] = useState('');
  const [residentDob, setResidentDob] = useState('');

  const [error, setError] = useState('');

  const handleVolunteerSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!volunteerUsername.trim() || !volunteerPassword) {
      setError(t.errVolunteerRequired);
      return;
    }
    const res = verifyVolunteer(volunteerUsername, volunteerPassword);
    if (res.success) {
      onLogin(res.user);
    } else {
      setError(t.errVolunteerInvalid);
    }
  };

  const handleResidentSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!residentName.trim() || !residentDob) {
      setError(t.errResidentRequired);
      return;
    }
    const res = verifyIndividual(residentName, residentDob, households);
    if (res.success) {
      onLogin(res.user);
    } else {
      setError(t.errResidentNotFound);
    }
  };

  return (
    <div className="login-screen-overlay">
      <div className="login-container-card">
        {/* Language Switcher at Top */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            type="button"
            className="btn-lang-toggle"
            onClick={onToggleLang}
            title="Switch Language / ഭാഷ മാറ്റുക"
          >
            <Globe size={13} />
            <span>{t.langToggle}</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-box emoji-logo">
            <span style={{ fontSize: '28px', lineHeight: 1 }}>🙏</span>
          </div>
          <h1 className="login-title">{t.appTitle}</h1>
          <p className="login-subtitle">{t.appCaption}</p>
        </div>

        {/* Role Choice Cards */}
        <div className="login-role-selector">
          <button
            type="button"
            className={`role-choice-card ${selectedRole === 'volunteer' ? 'active' : ''}`}
            onClick={() => {
              setSelectedRole('volunteer');
              setError('');
            }}
          >
            <div className="role-choice-icon">
              <Users size={18} />
            </div>
            <div className="role-choice-content">
              <strong>{t.volunteerPortal}</strong>
              <span>{t.volunteerDesc}</span>
            </div>
          </button>

          <button
            type="button"
            className={`role-choice-card ${selectedRole === 'resident' ? 'active' : ''}`}
            onClick={() => {
              setSelectedRole('resident');
              setError('');
              // Automatically switch to Malayalam for elder convenience if in English
              if (lang === 'en' && typeof onToggleLang === 'function') {
                onToggleLang();
              }
            }}
          >
            <div className="role-choice-icon">
              <User size={18} />
            </div>
            <div className="role-choice-content">
              <strong>{t.residentPortal}</strong>
              <span>{t.residentDesc}</span>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error-banner">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Form 1: Volunteer Login */}
        {selectedRole === 'volunteer' ? (
          <form onSubmit={handleVolunteerSubmit} className="login-form">
            <div className="login-field-group">
              <label className="login-label">{t.usernameLabel}</label>
              <div className="login-input-wrap">
                <Users size={15} className="input-icon" />
                <input
                  type="text"
                  className="login-input"
                  placeholder={t.usernamePlaceholder}
                  value={volunteerUsername}
                  onChange={(e) => setVolunteerUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-label">{t.passwordLabel}</label>
              <div className="login-input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type="password"
                  className="login-input"
                  placeholder={t.passwordPlaceholder}
                  value={volunteerPassword}
                  onChange={(e) => setVolunteerPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn">
              <span>{t.signInVolunteer}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Form 2: Individual / Elderly Login (Name + DOB password) */
          <form onSubmit={handleResidentSubmit} className="login-form">
            <div className="login-field-group">
              <label className="login-label">{t.residentNameLabel}</label>
              <div className="login-input-wrap">
                <User size={15} className="input-icon" />
                <input
                  type="text"
                  className="login-input"
                  placeholder={t.residentNamePlaceholder}
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-label">
                {t.residentDobLabel}
              </label>
              <div className="login-input-wrap">
                <Calendar size={15} className="input-icon" />
                <input
                  type="text"
                  className="login-input"
                  placeholder={t.residentDobPlaceholder}
                  value={residentDob}
                  onChange={(e) => setResidentDob(e.target.value)}
                  required
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {t.residentDobNote}
              </span>
            </div>

            <button type="submit" className="login-submit-btn resident-submit">
              <span>{t.signInResident}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
