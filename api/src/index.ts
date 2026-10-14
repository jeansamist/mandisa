import { createApp } from "./app.js";
import { pool } from "./db/client.js";
import { env } from "./env.js";
import { startJobs } from "./jobs/index.js";
import { loggableError, logger } from "./logger.js";

let stopJobs = () => {};

// Express 5 calls this callback on failure too, with the error.
const server = createApp().listen(env.PORT, (err?: Error) => {
  if (err) {
    const inUse = (err as NodeJS.ErrnoException).code === "EADDRINUSE";
    logger.fatal(
      { err },
      inUse
        ? `port ${env.PORT} is already in use: is another API dev server still running?`
        : "server failed to start",
    );
    process.exit(1);
  }
  logger.info(
    { port: env.PORT, logLevel: env.LOG_LEVEL },
    `API listening on http://localhost:${env.PORT}`,
  );
  // Background jobs only run once the server is really up.
  if (env.JOBS_ENABLED) stopJobs = startJobs();
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "shutting down");
  stopJobs();
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
