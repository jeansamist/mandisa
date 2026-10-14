import { createApp } from "./app.js";
import { pool } from "./db/client.js";
import { env } from "./env.js";
import { loggableError, logger } from "./logger.js";

const server = createApp().listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, logLevel: env.LOG_LEVEL },
    `API listening on http://localhost:${env.PORT}`,
  );
});

server.on("error", (err) => {
  logger.fatal({ err }, "server failed to start");
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "shutting down");
  server.close(() => {
    void pool.end().then(() => {
      logger.info("shutdown complete");
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: loggableError(reason) }, "unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err: loggableError(err) }, "uncaught exception");
  process.exit(1);
});
