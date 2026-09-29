import { app } from "../src/server.js";
import { connectDatabase } from "../src/config/database.js";

let initialized = false;

export default async function handler(
  req: import("express").Request,
  res: import("express").Response,
) {
  if (!initialized) {
    await connectDatabase();
    initialized = true;
  }

  return app(req, res);
}
