import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Clock, MapPin, Phone, Navigation, Crosshair, PhoneCall, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { calculatePriorityScore, getPriorityCategory, formatTimeAgo } from '../utils/priority';
import { getDistrictById } from '../utils/districts';
import { TRANSLATIONS } from '../utils/translations';
import { getEmergencyServicesByDistrict } from '../utils/emergencyServices';

// Create clean, high-contrast Leaflet pin icons for households
function createCustomIcon(category) {
  let colorClass = 'low';
  let badgeIcon = '✓';

  if (category === 'urgent') {
    colorClass = 'urgent';
    badgeIcon = '!';
  } else if (category === 'moderate') {
    colorClass = 'moderate';
    badgeIcon = '•';
  } else if (category === 'evacuated') {
    colorClass = 'evacuated';
    badgeIcon = '✓';
  }

  const iconHtml = `
    <div class="custom-marker-pin">
      ${category === 'urgent' ? '<div class="pulse-beacon"></div>' : ''}
      <div class="pin-bubble ${colorClass}">
        <div class="pin-inner-icon">
          <span style="font-weight: 800; font-size: 13px; line-height: 1;">${badgeIcon}</span>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

// User Location Pin with distinct box writing "Your Location"
function createUserLocationIcon(boxLabel = 'Your Location') {
  const iconHtml = `
    <div class="user-location-marker-wrapper">
      <div class="user-location-box">
        <span class="pulse-radar-dot"></span>
        <span class="user-location-text">${boxLabel}</span>
      </div>
      <div class="user-location-point">
        <div class="user-location-ring"></div>
        <div class="user-location-core"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-user-location-div-icon',
    iconSize: [140, 56],
    iconAnchor: [70, 50],
    popupAnchor: [0, -52],
  });
}

// Hospital Marker Icon with bold 'H' symbol
function createHospitalIcon() {
  const iconHtml = `
    <div class="emergency-service-pin hospital" title="Hospital (H)">
      <div class="emergency-symbol-badge badge-hospital">
        <span class="symbol-letter">H</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-emergency-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

// Fire Force Marker Icon with bold 'F' symbol
function createFireIcon() {
  const iconHtml = `
    <div class="emergency-service-pin fire" title="Fire Force (F)">
      <div class="emergency-symbol-badge badge-fire">
        <span class="symbol-letter">F</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-emergency-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

// Clinic / Primary Health Center Marker Icon with bold 'C' symbol
function createClinicIcon() {
  const iconHtml = `
    <div class="emergency-service-pin clinic" title="Clinic / PHC (C)">
      <div class="emergency-symbol-badge badge-clinic">
        <span class="symbol-letter">C</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-emergency-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

// Temporary pin icon for interactive pin drop
const pinDropIcon = L.divIcon({
  html: `
    <div style="display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="width:22px;height:22px;border-radius:50%;background:#0284c7;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.35);"></div>
    </div>
  `,
  className: 'pin-drop-temp-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map controller for district switching and smooth flying
function MapController({ selectedHousehold, currentDistrict, flyTarget }) {
  const map = useMap();

  useEffect(() => {
    const districtInfo = getDistrictById(currentDistrict);
    if (districtInfo) {
      map.flyTo(districtInfo.center, districtInfo.zoom, {
        duration: 1.2,
      });
    }
  }, [currentDistrict, map]);

  useEffect(() => {
    if (selectedHousehold && selectedHousehold.lat && selectedHousehold.lng) {
      map.flyTo([selectedHousehold.lat, selectedHousehold.lng], 15, {
        duration: 1.0,
      });
    }
  }, [selectedHousehold, map]);

  useEffect(() => {
    if (flyTarget && flyTarget.lat && flyTarget.lng) {
      map.flyTo([flyTarget.lat, flyTarget.lng], 15, {
        duration: 1.0,
      });
    }
  }, [flyTarget, map]);

  return null;
}

// Map click handler for location picking
function MapClickHandler({ isPinDropMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isPinDropMode) {
        onMapClick({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
  });

  return null;
}

export default function MapView({
  households,
  selectedHousehold,
  onSelectHousehold,
  onOpenDetails,
  isPinDropMode,
  tempCoords,
  onMapClick,
  onCancelPinDrop,
  currentDistrict,
  currentRole,
  currentUser,
  stats,
  lang = 'en',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const districtInfo = getDistrictById(currentDistrict);
  const [flyTarget, setFlyTarget] = useState(null);

  // Retrieve hospitals, clinics, fire stations, and travel vehicles for the active Kerala district
  const { hospitals, clinics = [], fireForce, specialCareVehicles = [] } = useMemo(() => {
    return getEmergencyServicesByDistrict(currentDistrict);
  }, [currentDistrict]);

  const [isCallServicesOpen, setIsCallServicesOpen] = useState(false);
  const [callServiceCategory, setCallServiceCategory] = useState('ALL');
  const [callSearch, setCallSearch] = useState('');

  // Combined list of all callable services for direct calling
  const allCallableServices = useMemo(() => {
    return [
      ...hospitals.map((h) => ({ ...h, categoryKey: 'HOSPITAL', categoryLabel: lang === 'ml' ? 'ആശുപത്രി (H)' : 'Hospital (H)' })),
      ...clinics.map((c) => ({ ...c, categoryKey: 'CLINIC', categoryLabel: lang === 'ml' ? 'ക്ലിനിക്ക് (C)' : 'Clinic / PHC (C)' })),
      ...fireForce.map((f) => ({ ...f, categoryKey: 'FIRE', categoryLabel: lang === 'ml' ? 'ഫയർ ഫോഴ്സ് (F)' : 'Fire & Rescue (F)' })),
      ...specialCareVehicles.map((v) => ({ ...v, categoryKey: 'TRAVEL', categoryLabel: lang === 'ml' ? 'യാത്രാ വാഹനം' : 'Travel / 4x4' })),
    ];
  }, [hospitals, clinics, fireForce, specialCareVehicles, lang]);

  const filteredCallableServices = useMemo(() => {
    return allCallableServices.filter((svc) => {
      if (callServiceCategory !== 'ALL' && svc.categoryKey !== callServiceCategory) {
        return false;
      }
      if (callSearch.trim()) {
        const q = callSearch.toLowerCase();
        const matchName = svc.name.toLowerCase().includes(q) || (svc.nameMl && svc.nameMl.toLowerCase().includes(q));
        const matchLoc = svc.locality && svc.locality.toLowerCase().includes(q);
        const matchPhone = svc.phone && svc.phone.includes(q);
        if (!matchName && !matchLoc && !matchPhone) return false;
      }
      return true;
    });
  }, [allCallableServices, callServiceCategory, callSearch]);

  // Determine user's current location on the map
  const userHousehold = useMemo(() => {
    return households.find((h) => h.id === currentUser?.householdId) || currentUser?.household || null;
  }, [households, currentUser]);

  // Default coordinate fallback per district
  const defaultDistrictCoords = useMemo(() => {
    const coordsMap = {
      Wayanad: [11.5540, 76.1265],  // Meppadi Responder Camp
      Idukki: [9.8510, 76.9690],    // Cheruthoni Civil Defense
      Alappuzha: [9.4970, 76.3350], // Alappuzha Command Post
    };
    return coordsMap[currentDistrict] || districtInfo.center;
  }, [currentDistrict, districtInfo]);

  const [userLocation, setUserLocation] = useState(defaultDistrictCoords);

  // Update user location when household, role, or district changes
  useEffect(() => {
    if (userHousehold && userHousehold.lat && userHousehold.lng) {
      setUserLocation([userHousehold.lat, userHousehold.lng]);
    } else {
      setUserLocation(defaultDistrictCoords);
    }
  }, [userHousehold, defaultDistrictCoords]);

  // Handle "Locate Me" GPS trigger
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6))];
          setUserLocation(coords);
          setFlyTarget({ lat: coords[0], lng: coords[1], ts: Date.now() });
        },
        () => {
          // If denied, fly to current userLocation
          setFlyTarget({ lat: userLocation[0], lng: userLocation[1], ts: Date.now() });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setFlyTarget({ lat: userLocation[0], lng: userLocation[1], ts: Date.now() });
    }
  };

  // Filter households by current district
  const districtHouseholds = households.filter(
    (h) => !h.district || h.district === currentDistrict
  );

  const isVolunteer = currentRole === 'volunteer';

  return (
    <div className="map-viewport">

      {/* Floating Statistics Overlay on Top Right of Map */}
      {isVolunteer && stats && (
        <div className="map-floating-stats">
          <div className="map-stat-pill stat-total">
            <span className="map-stat-label">{t.statsTotal}</span>
            <span className="map-stat-value">{stats.total}</span>
          </div>
          <div className="map-stat-pill stat-urgent">
            <span className="stat-indicator-dot dot-urgent"></span>
            <span className="map-stat-label">{t.statsUrgent}</span>
            <span className="map-stat-value">{stats.urgent}</span>
          </div>
          <div className="map-stat-pill stat-moderate">
            <span className="stat-indicator-dot dot-moderate"></span>
            <span className="map-stat-label">{t.statsWatch}</span>
            <span className="map-stat-value">{stats.moderate}</span>
          </div>
          <div className="map-stat-pill stat-low">
            <span className="stat-indicator-dot dot-low"></span>
            <span className="map-stat-label">{t.statsStable}</span>
            <span className="map-stat-value">{stats.low}</span>
          </div>
          <div className="map-stat-pill stat-evacuated">
            <span className="stat-indicator-dot dot-evacuated"></span>
            <span className="map-stat-label">{t.statsCamp}</span>
            <span className="map-stat-value">{stats.evacuated}</span>
          </div>
        </div>
      )}

      {/* Pin Drop Targeting Banner */}
      {isPinDropMode && (
        <div className="pin-drop-banner">
          <MapPin size={16} color="#0284c7" />
          <span>Click anywhere in {currentDistrict} to set the household location</span>
          {tempCoords && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#0369a1' }}>
              [{tempCoords.lat}, {tempCoords.lng}]
            </span>
          )}
          <button onClick={onCancelPinDrop}>Done</button>
        </div>
      )}

      <MapContainer
        center={districtInfo.center}
        zoom={districtInfo.zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          selectedHousehold={selectedHousehold}
          currentDistrict={currentDistrict}
          flyTarget={flyTarget}
        />
        <MapClickHandler isPinDropMode={isPinDropMode} onMapClick={onMapClick} />

        {/* Temporary location picker marker */}
        {isPinDropMode && tempCoords && (
          <Marker position={[tempCoords.lat, tempCoords.lng]} icon={pinDropIcon} />
        )}

        {/* ========================================================= */}
        {/* User Location Marker with box written "Your Location"     */}
        {/* ========================================================= */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={createUserLocationIcon(lang === 'ml' ? 'നിങ്ങളുടെ സ്ഥലം' : 'Your Location')}
            zIndexOffset={1200}
          >
            <Popup>
              <div className="popup-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0284c7', fontSize: '0.9rem' }}>
                  <Navigation size={15} />
                  <span>{lang === 'ml' ? 'നിങ്ങളുടെ സ്ഥലം' : 'Your Location'}</span>
                </div>
                <div style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {currentUser?.name || (lang === 'ml' ? 'നിലവിലെ ഉപയോക്താവ്' : 'Active User')}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {currentUser?.role === 'volunteer'
                    ? (lang === 'ml' ? 'ഫീൽഡ് വോളണ്ടിയർ / റെസ്ക്യൂ ടീം' : 'Field Volunteer / First Responder')
                    : (lang === 'ml' ? 'കുടുംബാംഗം / റസിഡന്റ്' : 'Registered Resident Household')}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {currentDistrict}, Kerala ({userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)})
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ========================================================= */}
        {/* Emergency Service Markers: Hospitals with 'H' symbol      */}
        {/* ========================================================= */}
        {hospitals.map((hosp) => (
          <Marker
            key={hosp.id}
            position={[hosp.lat, hosp.lng]}
            icon={createHospitalIcon()}
            zIndexOffset={800}
          >
            <Popup>
              <div className="emergency-popup">
                <div className="emergency-popup-header">
                  <div className="emergency-popup-badge hospital">H</div>
                  <div>
                    <div className="emergency-popup-title">
                      {lang === 'ml' && hosp.nameMl ? hosp.nameMl : hosp.name}
                    </div>
                    <div className="emergency-popup-locality">
                      {hosp.locality}, {lang === 'ml' ? 'കേരളം' : 'Kerala'}
                    </div>
                  </div>
                </div>
                <div className="emergency-popup-detail">
                  <strong>{lang === 'ml' ? 'ചികിത്സാ വിഭാഗം:' : '24x7 Emergency Care:'}</strong> {hosp.beds}
                </div>
                <div className="emergency-popup-detail" style={{ color: '#15803d', fontWeight: 600 }}>
                  {hosp.status}
                </div>
                <a
                  href={`tel:${hosp.phone.replace(/[^0-9]/g, '')}`}
                  className="emergency-popup-call-btn hospital"
                >
                  <Phone size={13} />
                  <span>{lang === 'ml' ? 'വിളിക്കുക:' : 'Call Hospital:'} {hosp.phone}</span>
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ========================================================= */}
        {/* Emergency Service Markers: Fire Force with 'F' symbol     */}
        {/* ========================================================= */}
        {fireForce.map((fire) => (
          <Marker
            key={fire.id}
            position={[fire.lat, fire.lng]}
            icon={createFireIcon()}
            zIndexOffset={800}
          >
            <Popup>
              <div className="emergency-popup">
                <div className="emergency-popup-header">
                  <div className="emergency-popup-badge fire">F</div>
                  <div>
                    <div className="emergency-popup-title">
                      {lang === 'ml' && fire.nameMl ? fire.nameMl : fire.name}
                    </div>
                    <div className="emergency-popup-locality">
                      {fire.locality}, {lang === 'ml' ? 'കേരളം' : 'Kerala'}
                    </div>
                  </div>
                </div>
                <div className="emergency-popup-detail">
                  <strong>{lang === 'ml' ? 'രക്ഷാപ്രവർത്തന സജ്ജീകരണം:' : 'Rescue Capability:'}</strong> {fire.equipment}
                </div>
                <div className="emergency-popup-detail" style={{ color: '#b91c1c', fontWeight: 600 }}>
                  {fire.status}
                </div>
                <a
                  href="tel:101"
                  className="emergency-popup-call-btn fire"
                >
                  <Phone size={13} />
                  <span>{lang === 'ml' ? 'ഫയർ & റെസ്ക്യൂ വിളിക്കുക: 101' : 'Call Fire Force: 101'}</span>
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ========================================================= */}
        {/* Emergency Service Markers: Clinics & PHCs with 'C' symbol */}
        {/* ========================================================= */}
        {clinics.map((clinic) => (
          <Marker
            key={clinic.id}
            position={[clinic.lat, clinic.lng]}
            icon={createClinicIcon()}
            zIndexOffset={800}
          >
            <Popup>
              <div className="emergency-popup">
                <div className="emergency-popup-header">
                  <div className="emergency-popup-badge clinic">C</div>
                  <div>
                    <div className="emergency-popup-title">
                      {lang === 'ml' && clinic.nameMl ? clinic.nameMl : clinic.name}
                    </div>
                    <div className="emergency-popup-locality">
                      {clinic.locality}, {lang === 'ml' ? 'കേരളം' : 'Kerala'}
                    </div>
                  </div>
                </div>
                <div className="emergency-popup-detail">
                  <strong>{lang === 'ml' ? 'സേവനങ്ങൾ / ഉപകരണങ്ങൾ:' : 'Medical Facilities:'}</strong>{' '}
                  {lang === 'ml' && clinic.featuresMl ? clinic.featuresMl : clinic.features}
                </div>
                <div className="emergency-popup-detail" style={{ color: '#0369a1', fontWeight: 600 }}>
                  {clinic.status}
                </div>
                <a
                  href={`tel:${clinic.phone.replace(/[^0-9+]/g, '')}`}
                  className="emergency-popup-call-btn clinic"
                >
                  <Phone size={13} />
                  <span>{lang === 'ml' ? 'ക്ലിനിക്ക് വിളിക്കുക:' : 'Call Clinic:'} {clinic.phone}</span>
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ========================================================= */}
        {/* District Household Markers                                */}
        {/* ========================================================= */}
        {districtHouseholds.map((household) => {
          const { score, hoursSinceCheckIn } = calculatePriorityScore(household);
          const category = getPriorityCategory(score, household.status);
          const icon = createCustomIcon(category);

          return (
            <Marker
              key={household.id}
              position={[household.lat, household.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectHousehold(household),
              }}
            >
              <Popup>
                <div className="popup-container">
                  <div className="popup-title">
                    {isVolunteer
                      ? household.name
                      : `Household (${household.address || currentDistrict})`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {household.address}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      className={`status-badge ${
                        household.status === 'Needs urgent help'
                          ? 'urgent'
                          : household.status.toLowerCase()
                      }`}
                    >
                      {household.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {lang === 'ml' ? 'അവസാനം സ്ഥിരീകരിച്ചത്:' : 'Last checked:'} {formatTimeAgo(hoursSinceCheckIn, lang)}
                  </div>

                  {isVolunteer && (
                    <button
                      className="popup-action-btn"
                      onClick={() => {
                        onSelectHousehold(household);
                        onOpenDetails(household);
                      }}
                    >
                      {lang === 'ml' ? 'വിവരങ്ങൾ പുതുക്കുക' : 'Update Triage & Status'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Clean Map Legend */}
      <div className="map-legend">
        <div className="legend-title">{currentDistrict} Legend</div>
        <div className="legend-item">
          <div className="legend-user-dot"></div>
          <span><strong>{lang === 'ml' ? 'നിങ്ങളുടെ സ്ഥലം' : 'Your Location'}</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-symbol-badge hospital">H</div>
          <span>{lang === 'ml' ? 'ആശുപത്രി (Hospital)' : 'Hospital (H)'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-symbol-badge clinic">C</div>
          <span>{lang === 'ml' ? 'ക്ലിനിക്ക് / PHC (Clinic)' : 'Clinic / PHC (C)'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-symbol-badge fire">F</div>
          <span>{lang === 'ml' ? 'ഫയർ ഫോഴ്സ് (Fire Force)' : 'Fire Force (F)'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-box urgent"></div>
          <span>{lang === 'ml' ? 'ചുവപ്പ്: അടിയന്തിരം (Urgent)' : 'Red: Urgent'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-box moderate"></div>
          <span>{lang === 'ml' ? 'ഓറഞ്ച്: ശ്രദ്ധയിൽ (Watch)' : 'Orange: Watch'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-box low"></div>
          <span>{lang === 'ml' ? 'പച്ച: സുരക്ഷിതം (Stable)' : 'Green: Stable'}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color-box evacuated"></div>
          <span>{lang === 'ml' ? 'നീല: റിലീഫ് ക്യാമ്പിൽ' : 'Blue: In Relief Camp'}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Volunteer Floating "Call Services" Dock (Bottom Left)     */}
      {/* ========================================================= */}
      {isVolunteer && (
        <div className={`map-call-services-panel ${isCallServicesOpen ? 'open' : 'collapsed'}`}>
          {!isCallServicesOpen ? (
            <button
              className="btn-call-services-trigger"
              onClick={() => setIsCallServicesOpen(true)}
              title={lang === 'ml' ? 'അടിയന്തര സഹായ സേവനങ്ങളെ വിളിക്കുക' : 'Call Emergency Services'}
            >
              <div className="call-services-trigger-icon">
                <PhoneCall size={16} />
              </div>
              <div className="call-services-trigger-text">
                <span className="trigger-main-title">
                  {lang === 'ml' ? 'സേവനങ്ങളെ വിളിക്കുക' : 'Call Services'}
                </span>
                <span className="trigger-sub-title">
                  {lang === 'ml' ? 'ആശുപത്രി, ഫയർ, യാത്ര, ക്ലിനിക്ക്' : 'Hospitals, Fire, Travel, Clinics'} ({allCallableServices.length})
                </span>
              </div>
              <ChevronUp size={16} className="trigger-chevron" />
            </button>
          ) : (
            <div className="call-services-drawer">
              <div className="cs-drawer-header">
                <div className="cs-drawer-title-wrap">
                  <div className="cs-drawer-icon">
                    <PhoneCall size={16} />
                  </div>
                  <div>
                    <div className="cs-drawer-title">
                      {lang === 'ml' ? `അടിയന്തര സഹായ സേവനങ്ങൾ (${currentDistrict})` : `Call Emergency Services (${currentDistrict})`}
                    </div>
                    <div className="cs-drawer-subtitle">
                      {lang === 'ml' ? 'വ്യക്തികൾക്ക് ആവശ്യമുള്ളപ്പോൾ നേരിട്ട് വിളിക്കാം' : 'Direct emergency dispatch for residents in need'}
                    </div>
                  </div>
                </div>
                <button
                  className="cs-drawer-close-btn"
                  onClick={() => setIsCallServicesOpen(false)}
                  title="Close"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* Category tabs */}
              <div className="cs-category-bar">
                <button
                  className={`cs-cat-btn ${callServiceCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setCallServiceCategory('ALL')}
                >
                  {lang === 'ml' ? 'എല്ലാം' : 'All'} ({allCallableServices.length})
                </button>
                <button
                  className={`cs-cat-btn ${callServiceCategory === 'HOSPITAL' ? 'active' : ''}`}
                  onClick={() => setCallServiceCategory('HOSPITAL')}
                >
                  {lang === 'ml' ? 'ആശുപത്രി (H)' : 'Hospitals (H)'} ({hospitals.length})
                </button>
                <button
                  className={`cs-cat-btn ${callServiceCategory === 'CLINIC' ? 'active' : ''}`}
                  onClick={() => setCallServiceCategory('CLINIC')}
                >
                  {lang === 'ml' ? 'ക്ലിനിക്ക് (C)' : 'Clinics (C)'} ({clinics.length})
                </button>
                <button
                  className={`cs-cat-btn ${callServiceCategory === 'FIRE' ? 'active' : ''}`}
                  onClick={() => setCallServiceCategory('FIRE')}
                >
                  {lang === 'ml' ? 'ഫയർ ഫോഴ്സ് (F)' : 'Fire Force (F)'} ({fireForce.length})
                </button>
                <button
                  className={`cs-cat-btn ${callServiceCategory === 'TRAVEL' ? 'active' : ''}`}
                  onClick={() => setCallServiceCategory('TRAVEL')}
                >
                  {lang === 'ml' ? 'യാത്ര / 4x4' : 'Travel / 4x4'} ({specialCareVehicles.length})
                </button>
              </div>

              {/* Search */}
              <div className="cs-search-row">
                <Search size={14} className="cs-search-icon" />
                <input
                  type="text"
                  className="cs-search-input"
                  placeholder={lang === 'ml' ? 'സേവനം, സ്ഥലം, അല്ലെങ്കിൽ ഫോൺ നമ്പർ തിരയുക...' : 'Search hospital, clinic, 4x4, boat, area...'}
                  value={callSearch}
                  onChange={(e) => setCallSearch(e.target.value)}
                />
              </div>

              {/* Service cards list */}
              <div className="cs-service-cards-list">
                {filteredCallableServices.length === 0 ? (
                  <div className="cs-empty-state">
                    {lang === 'ml' ? 'സേവനങ്ങളൊന്നും കണ്ടെത്തിയില്ല.' : 'No emergency services matched your filter.'}
                  </div>
                ) : (
                  filteredCallableServices.map((svc) => {
                    const hasMapCoords = Boolean(svc.lat && svc.lng);
                    const callHref = `tel:${(svc.phone || '').replace(/[^0-9+]/g, '')}`;

                    return (
                      <div key={svc.id} className={`cs-service-card cat-${svc.categoryKey.toLowerCase()}`}>
                        <div className="cs-card-top">
                          <span className={`cs-badge cat-${svc.categoryKey.toLowerCase()}`}>
                            {svc.categoryLabel}
                          </span>
                          {svc.locality && (
                            <span className="cs-card-locality">
                              <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                              {svc.locality}
                            </span>
                          )}
                        </div>

                        <div className="cs-card-name">
                          {lang === 'ml' && svc.nameMl ? svc.nameMl : svc.name}
                        </div>

                        <div className="cs-card-features">
                          {svc.beds && (
                            <div className="cs-feature-item">
                              <strong>{lang === 'ml' ? 'സൗകര്യം:' : 'Care:'}</strong>{' '}
                              {lang === 'ml' && svc.bedsMl ? svc.bedsMl : svc.beds}
                            </div>
                          )}
                          {svc.features && (
                            <div className="cs-feature-item">
                              <strong>{lang === 'ml' ? 'സവിശേഷത:' : 'Equip:'}</strong>{' '}
                              {lang === 'ml' && svc.featuresMl ? svc.featuresMl : svc.features}
                            </div>
                          )}
                          {svc.equipment && (
                            <div className="cs-feature-item">
                              <strong>{lang === 'ml' ? 'ഉപകരണങ്ങൾ:' : 'Rescue Gear:'}</strong>{' '}
                              {lang === 'ml' && svc.equipmentMl ? svc.equipmentMl : svc.equipment}
                            </div>
                          )}
                        </div>

                        <div className="cs-card-actions">
                          <a href={callHref} className="cs-call-btn">
                            <Phone size={13} />
                            <span>{lang === 'ml' ? 'വിളിക്കുക:' : 'Call:'} {svc.phone}</span>
                          </a>

                          {hasMapCoords && (
                            <button
                              className="cs-map-btn"
                              onClick={() => {
                                setFlyTarget({ lat: svc.lat, lng: svc.lng, ts: Date.now() });
                              }}
                              title={lang === 'ml' ? 'മാപ്പിൽ കാണിക്കുക' : 'Locate on Map'}
                            >
                              <Navigation size={12} />
                              <span>{lang === 'ml' ? 'മാപ്പിൽ' : 'Map'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
