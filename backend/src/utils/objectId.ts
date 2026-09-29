
import { Types } from "mongoose";

export function isValidObjectId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}
