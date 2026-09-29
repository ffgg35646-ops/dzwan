import { EstablishmentModel } from "../models/Establishment.js";

const ALLOWED = new Set([
  "active",
  "approved",
]);

export async function assertEstablishmentCanOperate(
  establishmentId: string
) {
  const establishment =
    await EstablishmentModel.findById(
      establishmentId
    );

  if (!establishment) {
    throw new Error("ESTABLISHMENT_NOT_FOUND");
  }

  const status =
    String(
      (establishment as any).status ||
      (establishment as any).approvalStatus ||
      ""
    ).toLowerCase();

  if (!ALLOWED.has(status)) {
    throw new Error(
      `ESTABLISHMENT_NOT_APPROVED:${status || "pending"}`
    );
  }

  return establishment;
}
