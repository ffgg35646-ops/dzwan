import { Types } from "mongoose";
import { captainCanWorkNow } from "./dispatch.service.js";
import { UserModel } from "../models/User.js";
import { areCaptainDocumentsComplete } from "./captain-document-compliance.service.js";

export async function canCaptainReceiveOrder(
  captainId: Types.ObjectId,
) {
  const captain = await UserModel.findById(captainId)
    .select("status role operationalEnabled governorateId areaId")
    .lean();

  if (!captain || captain.role !== "captain") {
    return {
      allowed: false,
      reason: "CAPTAIN_NOT_FOUND",
    };
  }

  if (captain.status !== "active") {
    return {
      allowed: false,
      reason: "CAPTAIN_NOT_ACTIVE",
    };
  }

  if (captain.operationalEnabled === false) {
    return {
      allowed: false,
      reason: "CAPTAIN_OPERATIONAL_DISABLED",
    };
  }

  const location = await import("../models/Location.js").then(
    ({ LocationModel }) =>
      LocationModel.findById(captain.governorateId)
        .select("captainsEnabled areas")
        .lean(),
  );

  if (!location || location.captainsEnabled === false) {
    return {
      allowed: false,
      reason: "CAPTAIN_GOVERNORATE_OPERATIONAL_DISABLED",
    };
  }

  const area = location.areas.find(
    (item) => item._id.toString() === String(captain.areaId),
  );

  if (!area || area.captainsEnabled === false) {
    return {
      allowed: false,
      reason: "CAPTAIN_AREA_OPERATIONAL_DISABLED",
    };
  }

  const documentsComplete =
    await areCaptainDocumentsComplete(captainId);

  if (!documentsComplete) {
    return {
      allowed: false,
      reason: "CAPTAIN_DOCUMENTS_INCOMPLETE",
    };
  }

  const shiftOk =
    await captainCanWorkNow(captainId);

  if (!shiftOk) {
    return {
      allowed: false,
      reason: "CAPTAIN_OUTSIDE_SHIFT",
    };
  }

  return {
    allowed: true,
  };
}
