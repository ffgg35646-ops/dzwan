export interface DispatchCandidate {
  isOnline: boolean;
  inShift: boolean;
  sameGovernorate: boolean;
  sameArea: boolean;
  inWorkArea: boolean;
  inGeofence: boolean;
  activeOrders: number;
  maxActiveOrders: number;
  distanceKm: number;
  priority: number;
}

export function scoreDispatchCandidate(
  captain: DispatchCandidate
) {
  if (!captain.isOnline) return -Infinity;
  if (!captain.inShift) return -Infinity;
  if (
    !captain.sameGovernorate &&
    !captain.inWorkArea
  ) return -Infinity;
  if (
    !captain.sameArea &&
    !captain.inWorkArea
  ) {
    return -Infinity;
  }

  if (
    captain.activeOrders >=
    captain.maxActiveOrders
  ) {
    return -Infinity;
  }

  let score = 0;

  if (captain.sameArea) score += 1000;
  if (captain.inWorkArea) score += 700;
  if (captain.sameGovernorate) score += 300;
  if (captain.inGeofence) score += 200;

  score += Math.max(
    0,
    300 - captain.distanceKm * 25
  );

  score -= captain.activeOrders * 75;
  score += Number(captain.priority || 0);

  return score;
}

export function rankDispatchCandidates(
  candidates: DispatchCandidate[]
) {
  return candidates
    .map((captain) => ({
      captain,
      score: scoreDispatchCandidate(captain),
    }))
    .filter((x) => x.score !== -Infinity)
    .sort((a, b) => b.score - a.score);
}
