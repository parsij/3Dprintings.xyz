const fs = require("fs");
const path = require("path");
const { run, makeWorkerUtils } = require("graphile-worker");
const { buildConnectionString } = require("./connectionString.cjs");
const taskList = require("./tasks/index.cjs");

const crontabFile = path.join(__dirname, "crontab");

let workerUtils = null;
let workerRunnerPromise = null;
let workerRunnerRelease = null;

async function initWorkerQueue() {
  if (workerUtils) return workerUtils;

  const connectionString = buildConnectionString();
  workerUtils = await makeWorkerUtils({ connectionString });
  await workerUtils.migrate();
  return workerUtils;
}

async function enqueueWrite(taskIdentifier, payload = {}, options = {}) {
  const utils = await initWorkerQueue();
  return utils.addJob(taskIdentifier, payload, {
    maxAttempts: 5,
    ...options,
  });
}

async function startWorkerRunner() {
  if (workerRunnerPromise) return workerRunnerPromise;

  await initWorkerQueue();

  const connectionString = buildConnectionString();
  workerRunnerPromise = run({
    connectionString,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    taskList,
    crontabFile,
    noHandleSignals: true,
  }).then((runner) => {
    workerRunnerRelease = runner;
    console.log("Graphile Worker started");
    if (fs.existsSync(crontabFile)) {
      console.log(`Graphile Worker crontab enabled (${crontabFile})`);
    } else {
      console.warn(`Graphile Worker crontab missing at ${crontabFile}; recurring jobs disabled.`);
    }
    return runner;
  });

  return workerRunnerPromise;
}

async function shutdownWorkerQueue() {
  if (workerRunnerRelease) {
    await workerRunnerRelease.stop();
    workerRunnerRelease = null;
    workerRunnerPromise = null;
  }
  if (workerUtils) {
    await workerUtils.release();
    workerUtils = null;
  }
}

module.exports = {
  initWorkerQueue,
  enqueueWrite,
  startWorkerRunner,
  shutdownWorkerQueue,
};
