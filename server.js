const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = String(process.env.ADMIN_KEY || "change-me-admin-key");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const EVENT_TYPES = new Set(["wedding", "dol", "house", "seventy", "pre"]);
const MAP_PROVIDERS = new Set(["kakao", "naver", "google"]);

const EVENT_LABELS = {
  wedding: "결혼식",
  dol: "돌잔치",
  house: "집들이",
  seventy: "칠순/고희",
  pre: "결혼전모임",
};

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 5;
const rsvpRateMap = new Map();

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ invitations: [], rsvps: [] }, null, 2),
      "utf-8",
    );
  }
}

function readStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  const parsed = JSON.parse(raw || "{}");

  if (!Array.isArray(parsed.invitations)) parsed.invitations = [];
  if (!Array.isArray(parsed.rsvps)) parsed.rsvps = [];

  return parsed;
}

function writeStore(store) {
  ensureStoreFile();
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  fs.renameSync(tmp, STORE_PATH);
}

function mutateStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function cleanString(value, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function cleanPhone(value) {
  return cleanString(value, 30).replace(/[^0-9+\-()\s]/g, "");
}

function parseDateOrEmpty(value) {
  const raw = cleanString(value, 40);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function parseCoords(value) {
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat);
  const lng = Number(value.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

function cleanAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];

  return accounts
    .slice(0, 6)
    .map((item) => ({
      bank: cleanString(item?.bank, 30),
      owner: cleanString(item?.owner, 40),
      number: cleanString(item?.number, 60),
    }))
    .filter((item) => item.bank || item.owner || item.number);
}

function randomId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function randomSlug(length = 7) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function uniqueSlug(existing) {
  const used = new Set(existing.map((it) => it.slug));
  for (let i = 0; i < 20; i += 1) {
    const slug = randomSlug(7);
    if (!used.has(slug)) return slug;
  }
  throw new Error("짧은 링크 생성 실패");
}

function buildPublicUrl(req, slug) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/i/${slug}`;
}

function isRsvpClosed(invitation) {
  if (!invitation?.rsvpDeadline) return false;
  const deadline = new Date(invitation.rsvpDeadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return Date.now() > deadline.getTime();
}

function summaryForInvitation(store, invitationId) {
  const rows = store.rsvps.filter((r) => r.invitationId === invitationId);
  const attending = rows.filter((r) => r.attending).length;
  const declined = rows.filter((r) => !r.attending).length;
  const totalGuests = rows.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);

  return {
    total: rows.length,
    attending,
    declined,
    totalGuests,
  };
}

function cleanInvitationPayload(body) {
  const eventType = EVENT_TYPES.has(body?.eventType) ? body.eventType : "wedding";
  const mapProvider = MAP_PROVIDERS.has(body?.mapProvider) ? body.mapProvider : "kakao";

  const invitation = {
    eventType,
    templateId: cleanString(body?.templateId, 40),
    title: cleanString(body?.title, 120),
    hostPrimary: cleanString(body?.hostPrimary, 50),
    hostSecondary: cleanString(body?.hostSecondary, 50),
    greeting: cleanString(body?.greeting, 2000),
    eventDateTime: parseDateOrEmpty(body?.eventDateTime),
    rsvpDeadline: parseDateOrEmpty(body?.rsvpDeadline),
    venueName: cleanString(body?.venueName, 120),
    address: cleanString(body?.address, 260),
    contactPhone: cleanPhone(body?.contactPhone),
    contactPhone2: cleanPhone(body?.contactPhone2),
    mapProvider,
    coords: parseCoords(body?.coords),
    showAccount: Boolean(body?.showAccount),
    accounts: cleanAccounts(body?.accounts),
    showQr: Boolean(body?.showQr),
  };

  return invitation;
}

function validateInvitation(payload) {
  if (!payload.title) return "초대장 제목은 필수입니다.";
  if (!payload.eventDateTime) return "행사 일시는 필수입니다.";

  const eventDt = new Date(payload.eventDateTime);
  if (Number.isNaN(eventDt.getTime())) {
    return "행사 일시 형식이 올바르지 않습니다.";
  }

  if (payload.rsvpDeadline) {
    const dead = new Date(payload.rsvpDeadline);
    if (Number.isNaN(dead.getTime())) return "RSVP 마감일 형식이 올바르지 않습니다.";
  }

  return "";
}

function requireAdmin(req, res, next) {
  const key =
    req.headers["x-admin-key"] ||
    req.query.key ||
    req.body?.key ||
    "";

  if (!key || String(key) !== ADMIN_KEY) {
    res.status(401).json({ ok: false, error: "관리자 인증 실패 (Admin Key 확인)" });
    return;
  }

  next();
}

function checkRsvpRate(ip) {
  const now = Date.now();
  const key = ip || "unknown";
  const arr = rsvpRateMap.get(key) || [];
  const recent = arr.filter((time) => now - time <= RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    rsvpRateMap.set(key, recent);
    return false;
  }

  recent.push(now);
  rsvpRateMap.set(key, recent);
  return true;
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_, res) => {
  res.json({ ok: true, now: nowIso() });
});

app.post("/api/invitations", (req, res) => {
  try {
    const payload = cleanInvitationPayload(req.body);
    const validationError = validateInvitation(payload);
    if (validationError) {
      res.status(400).json({ ok: false, error: validationError });
      return;
    }

    const result = mutateStore((store) => {
      const invitation = {
        id: randomId("inv"),
        slug: uniqueSlug(store.invitations),
        ...payload,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      store.invitations.push(invitation);
      return invitation;
    });

    res.json({
      ok: true,
      id: result.id,
      slug: result.slug,
      shortUrl: buildPublicUrl(req, result.slug),
      createdAt: result.createdAt,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "저장 중 오류" });
  }
});

app.get("/api/invitations/:slug", (req, res) => {
  const { slug } = req.params;
  const store = readStore();
  const invitation = store.invitations.find((it) => it.slug === slug);

  if (!invitation) {
    res.status(404).json({ ok: false, error: "초대장을 찾을 수 없습니다." });
    return;
  }

  const summary = summaryForInvitation(store, invitation.id);
  res.json({
    ok: true,
    invitation: {
      ...invitation,
      rsvpClosed: isRsvpClosed(invitation),
      rsvpSummary: summary,
    },
  });
});

app.post("/api/invitations/:slug/rsvp", (req, res) => {
  const { slug } = req.params;
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

  if (!checkRsvpRate(ip)) {
    res.status(429).json({ ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    return;
  }

  const body = req.body || {};
  const name = cleanString(body.name, 40);
  const phone = cleanPhone(body.phone);
  const attending = Boolean(body.attending);
  const guests = Math.max(0, Math.min(99, Number(body.guests) || 0));
  const message = cleanString(body.message, 500);

  if (!name || !phone) {
    res.status(400).json({ ok: false, error: "이름과 연락처는 필수입니다." });
    return;
  }

  try {
    const result = mutateStore((store) => {
      const invitation = store.invitations.find((it) => it.slug === slug);
      if (!invitation) {
        return { error: "초대장을 찾을 수 없습니다.", code: 404 };
      }

      if (isRsvpClosed(invitation)) {
        return { error: "RSVP 마감된 초대장입니다.", code: 400 };
      }

      const existing = store.rsvps.find(
        (row) => row.invitationId === invitation.id && row.phone === phone,
      );

      const guestsSafe = attending ? Math.max(1, guests || 1) : 0;

      if (existing) {
        existing.name = name;
        existing.attending = attending;
        existing.guests = guestsSafe;
        existing.message = message;
        existing.updatedAt = nowIso();
      } else {
        store.rsvps.push({
          id: randomId("rsvp"),
          invitationId: invitation.id,
          name,
          phone,
          attending,
          guests: guestsSafe,
          message,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }

      return { invitationId: invitation.id };
    });

    if (result.error) {
      res.status(result.code || 400).json({ ok: false, error: result.error });
      return;
    }

    const store = readStore();
    const summary = summaryForInvitation(store, result.invitationId);
    res.json({ ok: true, summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "RSVP 저장 실패" });
  }
});

app.get("/api/admin/invitations", requireAdmin, (req, res) => {
  const store = readStore();

  const invitations = store.invitations
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((inv) => {
      const summary = summaryForInvitation(store, inv.id);
      return {
        id: inv.id,
        slug: inv.slug,
        eventType: inv.eventType,
        eventTypeLabel: EVENT_LABELS[inv.eventType] || inv.eventType,
        title: inv.title,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        rsvpSummary: summary,
        shortUrl: buildPublicUrl(req, inv.slug),
      };
    });

  res.json({
    ok: true,
    invitations,
    securityWarning: ADMIN_KEY === "change-me-admin-key" ? "ADMIN_KEY 기본값 사용 중" : "",
  });
});

app.get("/api/admin/invitations/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const invitation = store.invitations.find((it) => it.id === req.params.id);

  if (!invitation) {
    res.status(404).json({ ok: false, error: "초대장을 찾을 수 없습니다." });
    return;
  }

  res.json({
    ok: true,
    invitation,
    summary: summaryForInvitation(store, invitation.id),
  });
});

app.put("/api/admin/invitations/:id", requireAdmin, (req, res) => {
  const payload = cleanInvitationPayload(req.body);
  const validationError = validateInvitation(payload);
  if (validationError) {
    res.status(400).json({ ok: false, error: validationError });
    return;
  }

  const result = mutateStore((store) => {
    const invitation = store.invitations.find((it) => it.id === req.params.id);
    if (!invitation) {
      return null;
    }

    Object.assign(invitation, payload, { updatedAt: nowIso() });
    return invitation;
  });

  if (!result) {
    res.status(404).json({ ok: false, error: "초대장을 찾을 수 없습니다." });
    return;
  }

  res.json({ ok: true, invitation: result });
});

app.get("/api/admin/invitations/:id/rsvps", requireAdmin, (req, res) => {
  const store = readStore();
  const invitation = store.invitations.find((it) => it.id === req.params.id);

  if (!invitation) {
    res.status(404).json({ ok: false, error: "초대장을 찾을 수 없습니다." });
    return;
  }

  const rows = store.rsvps
    .filter((r) => r.invitationId === invitation.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ ok: true, invitation: { id: invitation.id, title: invitation.title }, rsvps: rows });
});

app.get("/admin", (_, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/i/:slug", (_, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "invite.html"));
});

app.get("*", (_, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  ensureStoreFile();
  // eslint-disable-next-line no-console
  console.log(`[invitation-platform-codex] listening on http://localhost:${PORT}`);
});
