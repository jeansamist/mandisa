import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  "postgres://mandisa:mandisa@localhost:5433/mandisa_test";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Integration tests share one database.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      LOG_LEVEL: "silent",
      JOBS_ENABLED: "false",
      INTERNAL_API_KEY: "test-internal-key-0123456789",
      ELGIOPAY_API_KEY: "pk_test_dummy",
      ELGIOPAY_WEBHOOK_SECRET: "whsec_test",
      ADMIN_WHATSAPP: "+237600000000",
      ANTHROPIC_API_KEY: "sk-test-dummy",
      GEMINI_API_KEY: "gemini-test-dummy",
    },
  },
});
