const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;

      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        if (!port) {
          reject(new Error("사용 가능한 포트를 찾지 못했습니다."));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForHealth(baseUrl, timeoutMs = 15000) {
  const startedAt = Date.now();
  const endpoint = `${baseUrl}/health`;
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok === true) {
          return;
        }
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }

  throw new Error(`서버 헬스체크 타임아웃: ${endpoint} (${lastError ? lastError.message : "no response"})`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill("SIGTERM");
  });
}

async function startServer(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "..");
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "invite-platform-smoke-"));
  const port = options.port || (await getAvailablePort());
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, [path.join(rootDir, "server.js")], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      ADMIN_KEY: process.env.ADMIN_KEY || "ci-admin-key",
      BLOB_READ_WRITE_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  const collect = (chunk, source) => {
    const line = String(chunk || "").trim();
    if (!line) return;
    logs.push(`${source}: ${line}`);
  };

  child.stdout.on("data", (chunk) => collect(chunk, "stdout"));
  child.stderr.on("data", (chunk) => collect(chunk, "stderr"));

  try {
    await waitForHealth(baseUrl, options.timeoutMs || 15000);
  } catch (error) {
    await stopServer(child);
    throw new Error(`${error.message}\n${logs.join("\n")}`.trim());
  }

  return {
    baseUrl,
    dataDir,
    logs,
    async stop() {
      await stopServer(child);
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

module.exports = {
  startServer,
};
