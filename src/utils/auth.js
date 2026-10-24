// Authentication credentials & verification for Neighbourhood Disaster Buddy

export const VOLUNTEER_ACCOUNTS = [
  {
    username: 'rahul_rescuer',
    password: 'rescue@2026',
    name: 'Rahul Nair',
    role: 'Lead Field Coordinator',
    district: 'Wayanad',
  },
  {
    username: 'kavya_kfd',
    password: 'kerala#safe',
    name: 'Kavya S.',
    role: 'Civil Defense Volunteer',
    district: 'Idukki',
  },
  {
    username: 'anand_volunteer',
    password: 'wayanad123',
    name: 'Anand V.',
    role: 'Community First Responder',
    district: 'Alappuzha',
  },
];

// Verify Volunteer credentials
export function verifyVolunteer(username, password) {
  const account = VOLUNTEER_ACCOUNTS.find(
    (v) =>
      v.username.trim().toLowerCase() === username.trim().toLowerCase() &&
      v.password === password
  );
  if (account) {
    return {
      success: true,
      user: {
        role: 'volunteer',
        username: account.username,
        name: account.name,
        title: account.role,
        district: account.district,
      },
    };
  }
  return { success: false, message: 'Invalid volunteer username or password.' };
}

// Helper to normalize dates across DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, and YYYY-MM-DD
export function normalizeDate(str) {
  if (!str) return '';
  const clean = str.trim().replace(/[/.\s]/g, '-');
  const parts = clean.split('-');
  if (parts.length === 3) {
    // If DD-MM-YYYY
    if (parts[0].length <= 2 && parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    // If YYYY-MM-DD
    if (parts[0].length === 4 && parts[2].length <= 2) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return clean;
}

// Verify Individual / Elderly resident using Name + DOB (Date of Birth)
export function verifyIndividual(nameInput, dobInput, households) {
  const cleanName = nameInput.trim().toLowerCase();
  const cleanDob = dobInput.trim();
  const normInputDob = normalizeDate(cleanDob);

  // Find matching household by name (fuzzy or partial check) and flexible DOB
  const matched = households.find((h) => {
    const hName = h.name.toLowerCase();
    const nameMatches = hName.includes(cleanName) || cleanName.includes(hName.split(' ')[0]);
    if (!nameMatches) return false;

    if (!h.dob) return false;
    const normRecordDob = normalizeDate(h.dob);
    const dobMatches = (
      h.dob.trim() === cleanDob ||
      normRecordDob === normInputDob ||
      normRecordDob === cleanDob
    );
    return dobMatches;
  });

  if (matched) {
    return {
      success: true,
      user: {
        role: 'resident',
        householdId: matched.id,
        name: matched.name,
        district: matched.district,
        household: matched,
      },
    };
  }

  return {
    success: false,
    message: 'No resident found matching this Name and Date of Birth.',
  };
}
