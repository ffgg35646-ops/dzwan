export interface DispatchPolicyCandidate {
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

export function eligibleCaptain(
  c: DispatchPolicyCandidate
) {
  return (
    c.isOnline &&
    c.inShift &&
    c.sameGovernorate &&
    (c.sameArea || c.inWorkArea) &&
    c.activeOrders <
      c.maxActiveOrders
  );
}

export function dispatchScore(
  c: DispatchPolicyCandidate
) {
  if (!eligibleCaptain(c))
    return -Infinity;

  let score = 0;

  if (c.sameArea) score += 1000;
  if (c.inWorkArea) score += 700;
  if (c.inGeofence) score += 400;

  score += Math.max(
    0,
    300 -
      Number(c.distanceKm || 0) *
        25
  );

  score -=
    Number(c.activeOrders || 0) * 75;

  score +=
    Number(c.priority || 0);

  return score;
}

export function rankCaptains(
  candidates: DispatchPolicyCandidate[]
) {
  return candidates
    .map((captain) => ({
      captain,
      score:
        dispatchScore(captain),
    }))
    .filter(
      (x) =>
        x.score !== -Infinity
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
}
