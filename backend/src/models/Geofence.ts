import mongoose, { Schema, Document } from "mongoose";

export interface IGeofence extends Document {
  name: string;
  description?: string | null;
  governorateId: mongoose.Types.ObjectId;
  areaId?: mongoose.Types.ObjectId;
  enabled: boolean;
  polygon: { lat: number; lng: number }[];
}

const schema = new Schema<IGeofence>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, default: null, maxlength: 1000 },
    governorateId: { type: Schema.Types.ObjectId, ref: "Governorate", required: true },
    areaId: { type: Schema.Types.ObjectId, ref: "Area" },
    enabled: { type: Boolean, default: true },
    polygon: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }]
  },
  { timestamps: true }
);

export default mongoose.model<IGeofence>("Geofence", schema);
