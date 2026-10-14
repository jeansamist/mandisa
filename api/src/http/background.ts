import type { RequestHandler } from "express";
import { waitUntil } from "@vercel/functions";
import { loggableError, logger } from "../logger.js";
import { processOutbox } from "../services/notifications.js";

const log = logger.child({ module: "background" });

/**
 * Runs work after the response without blocking it. On Vercel, `waitUntil`
 * keeps the function alive until the work is done (there are no timers there).
 */
export function inBackground(name: string, task: () => Promise<unknown>) {
  const promise = task().catch((err: unknown) => {
    log.error(
      { err: loggableError(err), task: name },
      `background task ${name} failed`,
    );
  });
  waitUntil(promise);
}

/**
 * For routes that queue WhatsApp messages (orders, payments, contact,
 * assistant): sends them right after the response instead of waiting for a job.
 */
export const sendNotificationsAfterResponse: RequestHandler = (
  _req,
  res,
  next,
) => {
  const finished = new Promise<void>((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
  });
  inBackground("notifications", () => finished.then(() => processOutbox()));
  next();
};
