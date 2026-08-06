import { Router } from "express";

import aiSettingsRouter from "./ai-settings.js";
import conversationsRouter from "./conversations.js";
import messagesRouter from "./messages.js";
import testRouter from "./test.js";
import usersRouter from "./users.js";

const router = Router();

router.get("/", function (_req, res) {
  res.send("Express API is running");
});

router.use("/test", testRouter);
router.use("/users", usersRouter);
router.use("/conversations", conversationsRouter);
router.use("/conversations", messagesRouter);
router.use("/ai-settings", aiSettingsRouter);

export default router;

