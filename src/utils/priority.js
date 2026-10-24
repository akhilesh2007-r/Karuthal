/**
 * Priority score calculation for Neighbourhood Disaster Buddy
 *
 * Formula:
 * medicalNeed * 3 + mobility * 2 + (livesAlone ? 2 : 0) + (lowLying ? 2 : 0) + min(hoursSinceCheckIn, 24) / 4
 */

export function calculateHoursSinceCheckIn(lastCheckIn) {
  if (!lastCheckIn) return 24; // If never checked in, default to max decay
  const checkInDate = new Date(lastCheckIn);
  const now = new Date();
  const diffMs = now.getTime() - checkInDate.getTime();
  const hours = Math.max(0, diffMs / (1000 * 60 * 60));
  return hours;
}

export function calculatePriorityScore(household) {
  const medicalNeed = Number(household.medicalNeed) || 0;
  const mobility = Number(household.mobility) || 0;
  const livesAlone = Boolean(household.needs?.livesAlone);
  const lowLying = Boolean(household.needs?.lowLying);

  const hoursSinceCheckIn = calculateHoursSinceCheckIn(household.lastCheckIn);
  const timeDecayScore = Math.min(hoursSinceCheckIn, 24) / 4;

  const medicalScore = medicalNeed * 3;
  const mobilityScore = mobility * 2;
  const livesAloneScore = livesAlone ? 2 : 0;
  const lowLyingScore = lowLying ? 2 : 0;

  const totalScore = medicalScore + mobilityScore + livesAloneScore + lowLyingScore + timeDecayScore;

  return {
    score: Number(totalScore.toFixed(1)),
    rawScore: totalScore,
    hoursSinceCheckIn: Number(hoursSinceCheckIn.toFixed(1)),
    breakdown: {
      medicalScore,
      mobilityScore,
      livesAloneScore,
      lowLyingScore,
      timeDecayScore: Number(timeDecayScore.toFixed(2)),
      medicalNeed,
      mobility,
      livesAlone,
      lowLying,
    },
  };
}

export function getPriorityCategory(score, status) {
  if (status === 'Evacuated') {
    return 'evacuated';
  }
  if (status === 'Needs urgent help' || score >= 11) {
    return 'urgent';
  }
  if (score >= 6) {
    return 'moderate';
  }
  return 'low';
}

export function getCategoryBadge(category) {
  switch (category) {
    case 'urgent':
      return {
        label: 'Urgent',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        markerClass: 'marker-urgent',
      };
    case 'moderate':
      return {
        label: 'Moderate',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        markerClass: 'marker-moderate',
      };
    case 'low':
      return {
        label: 'Low / Stable',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.4)',
        markerClass: 'marker-low',
      };
    case 'evacuated':
      return {
        label: 'Evacuated',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        markerClass: 'marker-evacuated',
      };
    default:
      return {
        label: 'Unknown',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.4)',
        markerClass: 'marker-default',
      };
  }
}

export function formatTimeAgo(hours, lang = 'en') {
  if (lang === 'ml') {
    if (hours < 0.1) return 'ഇപ്പോൾ';
    if (hours < 1) return `${Math.round(hours * 60)} മിനിറ്റ് മുൻപ്`;
    if (hours < 24) return `${Math.floor(hours)} മണിക്കൂർ മുൻപ്`;
    const days = Math.floor(hours / 24);
    return `${days} ദിവസം മുൻപ്`;
  }
  if (hours < 0.1) return 'Just now';
  if (hours < 1) return `${Math.round(hours * 60)} mins ago`;
  if (hours < 24) return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${Math.floor(hours % 24)}h ago`;
}
