import { Request, Response } from "express";
import {
  trackOrderEvent, timeline, reassignOrder, createEmergency, setEmergencyStatus,
  securityLog, versionCheck, setCentralSetting, getCentralSettings, maintenanceCheck,
  resolveGeofence, createComplaint, cancelOrder30_46, getStuckOrders
} from "../services/requirements-30-46-runtime.service.js";

const uid = (req: Request) => (req as any).user?.sub || null;

export async function event(req: Request, res: Response) {
  res.json(await trackOrderEvent({
    ...req.body,
    orderId: String(req.params.orderId),
    actorId: uid(req),
    actorRole: (req as any).user?.role
  }));
}

export async function orderTimeline(req: Request, res: Response) {
  res.json(await timeline(String(req.params.orderId)));
}

export async function reassign(req: Request, res: Response) {
  res.json(await reassignOrder(String(req.params.orderId), req.body.newCaptainId, uid(req), req.body.reason));
}

export async function emergency(req: Request, res: Response) {
  res.json(await createEmergency({ ...req.body, captainId: uid(req) }));
}

export async function emergencyStatus(req: Request, res: Response) {
  res.json(await setEmergencyStatus(String(req.params.id), req.body.status));
}

export async function stuck(req: Request, res: Response) {
  res.json(await getStuckOrders(Number(req.query.minutes || 10)));
}

export async function security(req: Request, res: Response) {
  res.json(await securityLog({ ...req.body, userId: uid(req) }));
}

export async function version(req: Request, res: Response) {
  res.json(await versionCheck(req.params.app as any, String(req.query.version || "")));
}

export async function settings(req: Request, res: Response) {
  res.json(await getCentralSettings(req.query.category ? String(req.query.category) : undefined));
}

export async function updateSetting(req: Request, res: Response) {
  res.json(await setCentralSetting({ ...req.body, updatedBy: uid(req) }));
}

export async function maintenance(req: Request, res: Response) {
  res.json(await maintenanceCheck());
}

export async function geofence(req: Request, res: Response) {
  res.json(await resolveGeofence(Number(req.query.lat), Number(req.query.lng)));
}

export async function complaint(req: Request, res: Response) {
  res.status(201).json(await createComplaint({ ...req.body, createdBy: uid(req) }));
}

export async function cancel(req: Request, res: Response) {
  res.json(await cancelOrder30_46({
    orderId: String(req.params.orderId),
    actorId: uid(req),
    actorRole: (req as any).user?.role || "unknown",
    reason: req.body.reason
  }));
}
