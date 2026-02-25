const assert = require("node:assert/strict");
const test = require("node:test");
const { startServer } = require("../scripts/server-control");

test("server integration", async (t) => {
  const server = await startServer();

  try {
    await t.test("GET /health", async () => {
      const res = await fetch(`${server.baseUrl}/health`, { cache: "no-store" });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(typeof body.storeMode, "string");
    });

    await t.test("create invitation and load by slug", async () => {
      const createRes = await fetch(`${server.baseUrl}/api/invitations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "QA Integration Test",
          eventType: "wedding",
          eventDateTime: new Date("2030-05-01T12:00:00Z").toISOString(),
          greeting: "테스트 초대장입니다.",
        }),
      });

      assert.equal(createRes.status, 200);
      const created = await createRes.json();
      assert.equal(created.ok, true);
      assert.equal(typeof created.slug, "string");
      assert.equal(created.slug.length > 0, true);

      const loadRes = await fetch(`${server.baseUrl}/api/invitations/${created.slug}`, {
        cache: "no-store",
      });
      assert.equal(loadRes.status, 200);

      const loaded = await loadRes.json();
      assert.equal(loaded.ok, true);
      assert.equal(loaded.invitation.title, "QA Integration Test");
      assert.equal(loaded.invitation.rsvpSummary.total, 0);
    });

    await t.test("submit RSVP", async () => {
      const createRes = await fetch(`${server.baseUrl}/api/invitations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "RSVP Test",
          eventType: "dol",
          eventDateTime: new Date("2031-01-10T09:00:00Z").toISOString(),
        }),
      });

      const created = await createRes.json();

      const rsvpRes = await fetch(`${server.baseUrl}/api/invitations/${created.slug}/rsvp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "홍길동",
          phone: "010-1234-5678",
          attending: true,
          guests: 2,
          message: "참석하겠습니다.",
        }),
      });

      assert.equal(rsvpRes.status, 200);
      const body = await rsvpRes.json();
      assert.equal(body.ok, true);
      assert.equal(body.summary.total, 1);
      assert.equal(body.summary.attending, 1);
      assert.equal(body.summary.totalGuests, 2);
    });
  } finally {
    await server.stop();
  }
});
