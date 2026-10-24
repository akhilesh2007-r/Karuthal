import React, { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle, Check } from 'lucide-react';
import { addHousehold } from '../db/db';
import { calculatePriorityScore } from '../utils/priority';
import { KERALA_DISTRICTS, getDistrictById } from '../utils/districts';

export default function AddHouseholdModal({
  isOpen,
  onClose,
  tempCoords,
  onStartPinDrop,
  currentDistrict,
}) {
  if (!isOpen) return null;

  const districtObj = getDistrictById(currentDistrict);

  const [name, setName] = useState('');
  const [district, setDistrict] = useState(currentDistrict || 'Wayanad');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState(tempCoords ? tempCoords.lat : districtObj.center[0]);
  const [lng, setLng] = useState(tempCoords ? tempCoords.lng : districtObj.center[1]);

  const [needs, setNeeds] = useState({
    bedridden: false,
    oxygen: false,
    wheelchair: false,
    livesAlone: false,
    lowLying: false,
  });

  const [medicalNeed, setMedicalNeed] = useState(1);
  const [mobility, setMobility] = useState(1);
  const [consent, setConsent] = useState(false);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync coords if user clicked on map
  useEffect(() => {
    if (tempCoords) {
      setLat(tempCoords.lat);
      setLng(tempCoords.lng);
    }
  }, [tempCoords]);

  // When district changes, update default center if no custom map click
  const handleDistrictChange = (newDist) => {
    setDistrict(newDist);
    if (!tempCoords) {
      const d = getDistrictById(newDist);
      setLat(d.center[0]);
      setLng(d.center[1]);
    }
  };

  // Compute live preview score
  const mockHousehold = {
    medicalNeed,
    mobility,
    needs,
    lastCheckIn: new Date().toISOString(),
  };
  const { score } = calculatePriorityScore(mockHousehold);

  const toggleNeed = (key) => {
    setNeeds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a household name.');
      return;
    }

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      setError('Please provide valid latitude and longitude coordinates.');
      return;
    }

    if (!consent) {
      setError('Household consent is required to register disaster assistance records.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addHousehold({
        name: name.trim(),
        district,
        address: address.trim(),
        phone: phone.trim(),
        lat: Number(lat),
        lng: Number(lng),
        needs,
        medicalNeed,
        mobility,
        consent,
        status: score >= 11 ? 'Needs urgent help' : 'Contacted',
        notes: notes.trim(),
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save household: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span>Register Household ({district})</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: 'var(--urgent-bg)',
                border: '1px solid var(--urgent-border)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--urgent-red)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* District & Household Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">District *</label>
                <select
                  className="form-input"
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Household Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mariyamma Thomas or The Nambiar Family"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Location & Map Picker */}
            <div className="form-group">
              <label className="form-label">
                Location in {district} *
              </label>
              <div className="coords-selector-row">
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onStartPinDrop}
                  title="Click on the map to set location"
                >
                  <MapPin size={15} color="#0284c7" />
                  <span>Pick on Map</span>
                </button>
              </div>
            </div>

            {/* Address & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Street / Locality</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Riverbank Road, Meppadi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9447..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Needs Checklist */}
            <div className="form-group">
              <label className="form-label">Specific Needs & Vulnerabilities</label>
              <div className="needs-checkbox-grid">
                <div
                  className={`checkbox-card ${needs.bedridden ? 'checked' : ''}`}
                  onClick={() => toggleNeed('bedridden')}
                >
                  <div className="checkbox-custom">
                    {needs.bedridden && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="checkbox-label">Bedridden</span>
                </div>

                <div
                  className={`checkbox-card ${needs.oxygen ? 'checked' : ''}`}
                  onClick={() => toggleNeed('oxygen')}
                >
                  <div className="checkbox-custom">
                    {needs.oxygen && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="checkbox-label">Oxygen Dependent</span>
                </div>

                <div
                  className={`checkbox-card ${needs.wheelchair ? 'checked' : ''}`}
                  onClick={() => toggleNeed('wheelchair')}
                >
                  <div className="checkbox-custom">
                    {needs.wheelchair && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="checkbox-label">Wheelchair Bound</span>
                </div>

                <div
                  className={`checkbox-card ${needs.livesAlone ? 'checked' : ''}`}
                  onClick={() => toggleNeed('livesAlone')}
                >
                  <div className="checkbox-custom">
                    {needs.livesAlone && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="checkbox-label">Lives Alone</span>
                </div>

                <div
                  className={`checkbox-card ${needs.lowLying ? 'checked' : ''}`}
                  onClick={() => toggleNeed('lowLying')}
                  style={{ gridColumn: 'span 2' }}
                >
                  <div className="checkbox-custom">
                    {needs.lowLying && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="checkbox-label">Low-Lying / River Stream Flood Zone</span>
                </div>
              </div>
            </div>

            {/* Medical Need Rating (0 - 3) */}
            <div className="form-group">
              <label className="form-label">Medical Need (0 to 3)</label>
              <div className="score-segmented-group">
                {[
                  { val: 0, title: '0: None', desc: 'No daily medical need' },
                  { val: 1, title: '1: Mild', desc: 'Routine tablets / BP / Sugar' },
                  { val: 2, title: '2: Moderate', desc: 'Insulin / Inhaler / Regular care' },
                  { val: 3, title: '3: Critical', desc: 'Dialysis / Oxygen / Life support' },
                ].map((item) => (
                  <div
                    key={item.val}
                    className={`segmented-option ${medicalNeed === item.val ? 'active' : ''}`}
                    onClick={() => setMedicalNeed(item.val)}
                  >
                    <div className="segmented-num">{item.val}</div>
                    <div className="segmented-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobility Rating (0 - 3) */}
            <div className="form-group">
              <label className="form-label">Mobility Impairment (0 to 3)</label>
              <div className="score-segmented-group">
                {[
                  { val: 0, title: '0: Full', desc: 'Can walk freely' },
                  { val: 1, title: '1: Minor', desc: 'Walks with walking stick' },
                  { val: 2, title: '2: Limited', desc: 'Needs walker / wheelchair' },
                  { val: 3, title: '3: Immobile', desc: 'Bedbound / Stretcher needed' },
                ].map((item) => (
                  <div
                    key={item.val}
                    className={`segmented-option ${mobility === item.val ? 'active' : ''}`}
                    onClick={() => setMobility(item.val)}
                  >
                    <div className="segmented-num">{item.val}</div>
                    <div className="segmented-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consent Checkbox */}
            <div
              className="consent-box"
              onClick={() => setConsent(!consent)}
            >
              <div className="checkbox-custom" style={{ marginTop: '2px' }}>
                {consent && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="consent-text">
                <strong>Resident Consent Verified *</strong><br />
                The resident or family member has granted permission to record disaster triage and rescue tracking details.
              </div>
            </div>

            {/* Optional Notes */}
            <div className="form-group">
              <label className="form-label">Volunteer Field Notes (Optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Nearby landmarks, nearest road access, house color..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Register Household'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
