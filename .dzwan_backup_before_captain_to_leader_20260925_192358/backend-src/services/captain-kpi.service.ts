import { Types } from "mongoose";
import { getCaptainKpi as getCaptainKpiFinal } from "./r23-kpi-final.service.js";

export async function getCaptainKpi(
  captainId: Types.ObjectId,
  from: Date,
  to: Date,
) {
  return getCaptainKpiFinal(
    captainId.toString(),
    from,
    to,
  );
}
