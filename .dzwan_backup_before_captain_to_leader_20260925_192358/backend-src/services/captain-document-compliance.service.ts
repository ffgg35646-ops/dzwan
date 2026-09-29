import { Types } from "mongoose";
import { CaptainDocumentModel } from "../models/CaptainDocument.js";
import { OperationsSettingsModel } from "../models/OperationsSettings.js";

export async function areCaptainDocumentsComplete(
  captainId: Types.ObjectId,
) {
  const settings =
    await OperationsSettingsModel.findOne().lean();

  if (!settings?.requireCompleteCaptainDocuments) {
    return true;
  }

  const docs =
    await CaptainDocumentModel.find({
      captainId,
    }).lean();

  const requiredTypes = [
    "id_front",
    "id_back",
    "residence_front",
    "residence_back",
  ];

  return requiredTypes.every((type) =>
    docs.some(
      (doc) =>
        doc.documentType === type &&
        doc.status === "approved" &&
        (!doc.expiresAt || doc.expiresAt > new Date()),
    ),
  );
}
