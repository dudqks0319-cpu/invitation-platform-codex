const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../app");

function createMockReq({ params = {}, body = {}, headers = {}, query = {}, ip = "127.0.0.1" } = {}) {
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[String(key).toLowerCase()] = String(value);
  }

  if (!normalizedHeaders.host) {
    normalizedHeaders.host = "localhost";
  }

  return {
    params,
    body,
    query,
    headers: normalizedHeaders,
    ip,
    protocol: "http",
    socket: { remoteAddress: ip },
    get(name) {
      return this.headers[String(name).toLowerCase()];
    },
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

function parseRoute(routePath) {
  const parsed = new URL(routePath, "http://localhost");
  const query = Object.fromEntries(parsed.searchParams.entries());
  return {
    pathname: parsed.pathname,
    query,
  };
}

function routeParams(pathname, pattern) {
  const match = pathname.match(pattern);
  if (!match) return null;
  return match.slice(1).map((v) => decodeURIComponent(v));
}

function createTestClient() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "invite-api-test-"));
  const app = createApp({
    dataDir,
    useBlobStore: false,
    adminKey: "test-admin-key",
  });

  const handlers = app.locals.testHandlers;

  async function runAdminList(req, res) {
    let passed = false;

    await new Promise((resolve, reject) => {
      try {
        handlers.requireAdmin(req, res, (error) => {
          if (error) {
            reject(error);
            return;
          }
          passed = true;
          resolve();
        });

        if (!passed && res.headersSent) {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });

    if (passed && !res.headersSent) {
      await handlers.adminListInvitationsHandler(req, res);
    }
  }

  async function request(method, routePath, body, headers) {
    const { pathname, query } = parseRoute(routePath);

    let params = {};
    let handler;

    if (method === "POST" && pathname === "/api/invitations") {
      handler = handlers.createInvitationHandler;
    } else if (method === "GET") {
      const matched = routeParams(pathname, /^\/api\/invitations\/([^/]+)$/);
      if (matched) {
        params = { slug: matched[0] };
        handler = handlers.getInvitationBySlugHandler;
      }
    } else if (method === "POST") {
      const matched = routeParams(pathname, /^\/api\/invitations\/([^/]+)\/rsvp$/);
      if (matched) {
        params = { slug: matched[0] };
        handler = handlers.submitRsvpHandler;
      }
    }

    const req = createMockReq({ params, body, headers, query });
    const res = createMockRes();

    if (method === "GET" && pathname === "/api/admin/invitations") {
      await runAdminList(req, res);
    } else if (handler) {
      await handler(req, res);
    } else {
      throw new Error(`Unsupported test route: ${method} ${routePath}`);
    }

    return {
      status: res.statusCode,
      json: res.body,
    };
  }

  return {
    request,
    close() {
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

async function createInvitation(request) {
  const response = await request("POST", "/api/invitations", {
    title: "테스트 초대장",
    eventDateTime: "2030-05-10T12:00:00.000Z",
    hostPrimary: "테스트 호스트",
  });

  assert.equal(response.status, 200);
  assert.equal(response.json?.ok, true);
  assert.ok(response.json?.slug);

  return response.json;
}

test("create invitation success", async (t) => {
  const client = createTestClient();
  t.after(() => {
    client.close();
  });

  const response = await client.request("POST", "/api/invitations", {
    title: "결혼식 초대",
    eventDateTime: "2030-06-01T03:00:00.000Z",
    hostPrimary: "홍길동",
  });

  assert.equal(response.status, 200);
  assert.equal(response.json?.ok, true);
  assert.match(response.json?.id || "", /^inv_/);
  assert.match(response.json?.slug || "", /^[A-Za-z0-9]+$/);
  assert.match(response.json?.shortUrl || "", /\/i\//);
});

test("invitation fetch by slug", async (t) => {
  const client = createTestClient();
  t.after(() => {
    client.close();
  });

  const created = await createInvitation(client.request);
  const response = await client.request("GET", `/api/invitations/${created.slug}`);

  assert.equal(response.status, 200);
  assert.equal(response.json?.ok, true);
  assert.equal(response.json?.invitation?.slug, created.slug);
  assert.deepEqual(response.json?.invitation?.rsvpSummary, {
    total: 0,
    attending: 0,
    declined: 0,
    totalGuests: 0,
  });
});

test("RSVP submit and summary update", async (t) => {
  const client = createTestClient();
  t.after(() => {
    client.close();
  });

  const created = await createInvitation(client.request);

  const rsvpResponse = await client.request("POST", `/api/invitations/${created.slug}/rsvp`, {
    name: "김참석",
    phone: "010-1234-5678",
    attending: true,
    guests: 2,
    message: "축하드립니다",
  });

  assert.equal(rsvpResponse.status, 200);
  assert.equal(rsvpResponse.json?.ok, true);
  assert.deepEqual(rsvpResponse.json?.summary, {
    total: 1,
    attending: 1,
    declined: 0,
    totalGuests: 2,
  });

  const invitationResponse = await client.request("GET", `/api/invitations/${created.slug}`);
  assert.equal(invitationResponse.status, 200);
  assert.deepEqual(invitationResponse.json?.invitation?.rsvpSummary, {
    total: 1,
    attending: 1,
    declined: 0,
    totalGuests: 2,
  });
});

test("admin endpoint unauthorized without header", async (t) => {
  const client = createTestClient();
  t.after(() => {
    client.close();
  });

  const noHeader = await client.request("GET", "/api/admin/invitations");
  assert.equal(noHeader.status, 401);
  assert.equal(noHeader.json?.ok, false);
  assert.equal(noHeader.json?.code, "UNAUTHORIZED");

  const queryKey = await client.request("GET", "/api/admin/invitations?key=test-admin-key");
  assert.equal(queryKey.status, 401);

  const withHeader = await client.request("GET", "/api/admin/invitations", undefined, {
    "x-admin-key": "test-admin-key",
  });
  assert.equal(withHeader.status, 200);
  assert.equal(withHeader.json?.ok, true);
});
