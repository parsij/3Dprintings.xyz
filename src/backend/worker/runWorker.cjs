const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { startWorkerRunner, shutdownWorkerQueue } = require("./queue.cjs");

async function main() {
  await startWorkerRunner();
}

process.on("SIGINT", () => {
  shutdownWorkerQueue().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  shutdownWorkerQueue().finally(() => process.exit(0));
});

main().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
