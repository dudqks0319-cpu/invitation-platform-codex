#!/usr/bin/env node
const { startServer } = require("./server-control");

async function assertHealth(baseUrl) {
  const res = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`/health status ${res.status}`);
  }

  const body = await res.json();
  if (!body || body.ok !== true) {
    throw new Error(`/health 응답 형식 오류: ${JSON.stringify(body)}`);
  }

  console.log(`[smoke] /health ok (storeMode=${body.storeMode}, blobAccess=${body.blobAccess})`);
}

async function assertHtmlPage(baseUrl, pagePath) {
  const res = await fetch(`${baseUrl}${pagePath}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${pagePath} status ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${pagePath} content-type 오류: ${contentType}`);
  }

  const body = await res.text();
  if (!body || body.length < 200) {
    throw new Error(`${pagePath} HTML 본문이 비정상적으로 짧습니다.`);
  }

  console.log(`[smoke] ${pagePath} html ok`);
}

async function run() {
  const server = await startServer();

  try {
    console.log(`[smoke] server started: ${server.baseUrl}`);
    await assertHealth(server.baseUrl);
    await assertHtmlPage(server.baseUrl, "/");
    await assertHtmlPage(server.baseUrl, "/admin");
    await assertHtmlPage(server.baseUrl, "/i/example-slug");
    console.log("[smoke] all checks passed");
  } finally {
    await server.stop();
  }
}

run().catch((error) => {
  console.error("[smoke] failed");
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
