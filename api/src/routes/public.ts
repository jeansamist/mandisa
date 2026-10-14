import { Router } from "express";
import { publicAssistantConfig } from "../services/assistant/config.js";
import { sendMessage, sendMessageSchema } from "../services/assistant/chat.js";
import { contactSchema, submitContactMessage } from "../services/contact.js";

// Called by the web server on behalf of site visitors.
export const publicRouter = Router();

publicRouter.post("/contact", async (req, res) => {
  await submitContactMessage(contactSchema.parse(req.body));
  res.status(201).json({ received: true });
});

publicRouter.get("/assistant/config", async (_req, res) => {
  res.json(await publicAssistantConfig());
});

publicRouter.post("/assistant/messages", async (req, res) => {
  res.json(await sendMessage(sendMessageSchema.parse(req.body)));
});
