import Dexie from 'dexie';

export const db = new Dexie('NeighbourhoodDisasterBuddyDB');

db.version(3).stores({
  households: '++id, name, dob, district, status, lastCheckIn',
});

// Helper to compute timestamps relative to now
const getPastHoursISO = (hours) => {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString();
};

/**
 * Households dataset for Karuthal Demo.
 * Only the primary demo resident (Mariyamma Thomas) is pre-registered in an initial safe/contacted state.
 * Her emergency SOS and vulnerabilities are triggered live by the elder in the demo.
 */
export const SAMPLE_HOUSEHOLDS = [
  {
    name: 'Mariyamma Thomas',
    dob: '1940-03-15', // 84 years
    district: 'Wayanad',
    lat: 11.5492,
    lng: 76.1285,
    address: 'Near Old Church, Riverbank Road, Meppadi, Wayanad',
    phone: '+91 9447 123456',
    needs: {
      bedridden: false,
      oxygen: false,
      wheelchair: false,
      livesAlone: true,
      lowLying: true,
    },
    medicalNeed: 1,
    mobility: 1,
    consent: true,
    status: 'Contacted',
    sosReportedByResident: false,
    lastCheckIn: getPastHoursISO(1),
    notes: 'Elderly resident in Riverbank Road, Meppadi.',
  },
];

// Initialize and seed database, purging any prior dummy records
export async function initDatabase() {
  const all = await db.households.toArray();
  const hasOtherDummyNames = all.some((h) => h.name !== 'Mariyamma Thomas');

  // If empty, missing DOB, or contains prior dummy records, reseed cleanly with Mariyamma Thomas
  if (all.length === 0 || hasOtherDummyNames || !all[0]?.dob) {
    await db.households.clear();
    await db.households.bulkAdd(SAMPLE_HOUSEHOLDS);
    console.log('Seeded database with clean Mariyamma Thomas record for demo.');
  }
}

// Reset database back to sample seed
export async function resetToSampleData() {
  await db.households.clear();
  await db.households.bulkAdd(SAMPLE_HOUSEHOLDS);
}

// Add a new household
export async function addHousehold(data) {
  const now = new Date().toISOString();
  const household = {
    name: data.name,
    dob: data.dob || '1960-01-01',
    district: data.district || 'Wayanad',
    lat: Number(data.lat),
    lng: Number(data.lng),
    address: data.address || '',
    phone: data.phone || '',
    needs: {
      bedridden: Boolean(data.needs?.bedridden),
      oxygen: Boolean(data.needs?.oxygen),
      wheelchair: Boolean(data.needs?.wheelchair),
      livesAlone: Boolean(data.needs?.livesAlone),
      lowLying: Boolean(data.needs?.lowLying),
    },
    medicalNeed: Number(data.medicalNeed) || 0,
    mobility: Number(data.mobility) || 0,
    consent: Boolean(data.consent),
    status: data.status || 'Needs urgent help',
    lastCheckIn: data.lastCheckIn || now,
    notes: data.notes || '',
  };

  const id = await db.households.add(household);
  return id;
}

// Update status
export async function updateHouseholdStatus(id, newStatus) {
  await db.households.update(id, {
    status: newStatus,
    lastCheckIn: new Date().toISOString(),
  });
}

// Log check-in now
export async function logHouseholdCheckIn(id) {
  await db.households.update(id, {
    lastCheckIn: new Date().toISOString(),
  });
}

// Resident SOS Action (Supports instant SOS or SOS with client-selected vulnerabilities)
export async function residentTriggerSOS(id, vulnerabilities = null) {
  const updates = {
    status: 'Needs urgent help',
    lastCheckIn: new Date().toISOString(),
    sosReportedByResident: true,
    sosReportedAt: new Date().toISOString(),
  };

  if (vulnerabilities) {
    if (vulnerabilities.needs) {
      updates.needs = {
        bedridden: Boolean(vulnerabilities.needs.bedridden),
        oxygen: Boolean(vulnerabilities.needs.oxygen),
        wheelchair: Boolean(vulnerabilities.needs.wheelchair),
        livesAlone: Boolean(vulnerabilities.needs.livesAlone),
        lowLying: Boolean(vulnerabilities.needs.lowLying),
      };
    }
    if (typeof vulnerabilities.medicalNeed === 'number') {
      updates.medicalNeed = vulnerabilities.medicalNeed;
    }
    if (typeof vulnerabilities.mobility === 'number') {
      updates.mobility = vulnerabilities.mobility;
    }
  }

  await db.households.update(id, updates);
}

// Resident 1-Click "I Am Safe" Action
export async function residentReportSafe(id) {
  await db.households.update(id, {
    status: 'Contacted',
    lastCheckIn: new Date().toISOString(),
    sosReportedByResident: false,
  });
}

// Update household details
export async function updateHousehold(id, updates) {
  await db.households.update(id, updates);
}

// Delete household
export async function deleteHousehold(id) {
  await db.households.delete(id);
}
