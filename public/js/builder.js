(() => {
  const { EVENT_META, TEMPLATE_LIBRARY } = window.InviteTemplates;

  const els = {
    eventType: document.getElementById("eventType"),
    templateGrid: document.getElementById("templateGrid"),

    title: document.getElementById("title"),
    hostPrimary: document.getElementById("hostPrimary"),
    hostSecondary: document.getElementById("hostSecondary"),
    greeting: document.getElementById("greeting"),
    eventDateTime: document.getElementById("eventDateTime"),
    rsvpDeadline: document.getElementById("rsvpDeadline"),

    venueName: document.getElementById("venueName"),
    address: document.getElementById("address"),
    contactPhone: document.getElementById("contactPhone"),
    contactPhone2: document.getElementById("contactPhone2"),
    mapProvider: document.getElementById("mapProvider"),
    coords: document.getElementById("coords"),

    showAccount: document.getElementById("showAccount"),
    accountArea: document.getElementById("accountArea"),
    accountRows: Array.from(document.querySelectorAll(".account-row")),

    showQr: document.getElementById("showQr"),
    kakaoJsKey: document.getElementById("kakaoJsKey"),

    saveBtn: document.getElementById("saveBtn"),
    copyBtn: document.getElementById("copyBtn"),
    openBtn: document.getElementById("openBtn"),
    kakaoBtn: document.getElementById("kakaoBtn"),
    shortUrl: document.getElementById("shortUrl"),
    builderStatus: document.getElementById("builderStatus"),

    hostLabel1: document.getElementById("hostLabel1"),
    hostLabel2: document.getElementById("hostLabel2"),

    previewHero: document.getElementById("previewHero"),
    previewBadge: document.getElementById("previewBadge"),
    previewTitle: document.getElementById("previewTitle"),
    previewHosts: document.getElementById("previewHosts"),
    previewDate: document.getElementById("previewDate"),
    previewGreeting: document.getElementById("previewGreeting"),
    previewVenue: document.getElementById("previewVenue"),
    previewAddress: document.getElementById("previewAddress"),
    previewContact: document.getElementById("previewContact"),
    previewRsvp: document.getElementById("previewRsvp"),

    previewMap: document.getElementById("previewMap"),
    routePrimary: document.getElementById("routePrimary"),
    routeKakao: document.getElementById("routeKakao"),
    routeNaver: document.getElementById("routeNaver"),
    routeGoogle: document.getElementById("routeGoogle"),

    previewAccountSec: document.getElementById("previewAccountSec"),
    previewAccounts: document.getElementById("previewAccounts"),
    previewQrSec: document.getElementById("previewQrSec"),
    previewQr: document.getElementById("previewQr"),
  };

  const selectedTemplateByEvent = {};
  let lastEventType = "wedding";

  function setStatus(msg, type = "") {
    els.builderStatus.textContent = msg || "";
    els.builderStatus.className = `status${type ? ` ${type}` : ""}`;
  }

  function safeText(value, fallback = "") {
    const t = String(value ?? "").trim();
    return t || fallback;
  }

  function parseCoords(input) {
    const raw = String(input || "").trim();
    if (!raw) return null;
    const [latRaw, lngRaw] = raw.split(",").map((v) => Number(v.trim()));
    if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) return null;
    if (Math.abs(latRaw) > 90 || Math.abs(lngRaw) > 180) return null;
    return { lat: latRaw, lng: lngRaw };
  }

  function formatDateTime(value) {
    if (!value) return "일시를 입력해 주세요";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTemplateList(eventType) {
    return TEMPLATE_LIBRARY[eventType] || TEMPLATE_LIBRARY.wedding;
  }

  function getCurrentTemplate(eventType) {
    const list = getTemplateList(eventType);
    if (!selectedTemplateByEvent[eventType]) {
      selectedTemplateByEvent[eventType] = list[0].id;
    }
    return list.find((t) => t.id === selectedTemplateByEvent[eventType]) || list[0];
  }

  function applyTemplateSurface(element, template) {
    element.style.backgroundImage = "none";
    element.style.background = template?.background || "#ecf2ff";
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";

    if (template?.image) {
      element.style.backgroundImage = `url('${template.image}')`;
    }

    if (template?.market) {
      element.dataset.market = template.market;
    } else {
      element.removeAttribute("data-market");
    }
  }

  function collectAccounts() {
    return els.accountRows
      .map((row) => {
        const bank = row.querySelector(".acc-bank")?.value.trim() || "";
        const owner = row.querySelector(".acc-owner")?.value.trim() || "";
        const number = row.querySelector(".acc-number")?.value.trim() || "";
        return { bank, owner, number };
      })
      .filter((it) => it.bank || it.owner || it.number);
  }

  function collectPayload() {
    const eventType = els.eventType.value;
    const template = getCurrentTemplate(eventType);

    return {
      eventType,
      templateId: template.id,
      title: safeText(els.title.value, EVENT_META[eventType].defaultTitle),
      hostPrimary: safeText(els.hostPrimary.value),
      hostSecondary: safeText(els.hostSecondary.value),
      greeting: safeText(els.greeting.value, EVENT_META[eventType].defaultGreeting),
      eventDateTime: els.eventDateTime.value,
      rsvpDeadline: els.rsvpDeadline.value,
      venueName: safeText(els.venueName.value),
      address: safeText(els.address.value),
      contactPhone: safeText(els.contactPhone.value),
      contactPhone2: safeText(els.contactPhone2.value),
      mapProvider: els.mapProvider.value,
      coords: parseCoords(els.coords.value),
      showAccount: els.showAccount.checked,
      accounts: collectAccounts(),
      showQr: els.showQr.checked,
    };
  }

  function mapLinksFromPayload(payload) {
    const query = payload.coords
      ? `${payload.coords.lat},${payload.coords.lng}`
      : encodeURIComponent([payload.venueName, payload.address].filter(Boolean).join(" ") || "서울 시청");

    const kakao = payload.coords
      ? `https://map.kakao.com/link/map/${payload.venueName || "행사장"},${payload.coords.lat},${payload.coords.lng}`
      : `https://map.kakao.com/?q=${query}`;

    const naver = payload.coords
      ? `https://map.naver.com/v5/search/${payload.coords.lat},${payload.coords.lng}`
      : `https://map.naver.com/v5/search/${query}`;

    const google = payload.coords
      ? `https://www.google.com/maps/search/?api=1&query=${payload.coords.lat},${payload.coords.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

    const embed = payload.coords
      ? `https://www.google.com/maps?q=${payload.coords.lat},${payload.coords.lng}&z=16&output=embed`
      : `https://www.google.com/maps?q=${query}&z=16&output=embed`;

    return { kakao, naver, google, embed };
  }

  function renderTemplateGrid(eventType) {
    const list = getTemplateList(eventType);
    const selected = getCurrentTemplate(eventType).id;

    els.templateGrid.innerHTML = "";

    list.forEach((template) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `template-card${template.id === selected ? " active" : ""}`;

      const thumb = document.createElement("div");
      thumb.className = "template-thumb";
      applyTemplateSurface(thumb, template);

      const meta = document.createElement("div");
      meta.className = "template-meta";
      meta.innerHTML = `<div class="template-chip"></div><div class="template-name"></div><div class="template-desc"></div>`;
      meta.querySelector(".template-chip").textContent = template.market || "CURATED";
      meta.querySelector(".template-name").textContent = template.name;
      meta.querySelector(".template-desc").textContent = template.desc;

      card.appendChild(thumb);
      card.appendChild(meta);

      card.addEventListener("click", () => {
        selectedTemplateByEvent[eventType] = template.id;
        renderTemplateGrid(eventType);
        updatePreview();
      });

      els.templateGrid.appendChild(card);
    });
  }

  function renderQr(link, visible) {
    els.previewQrSec.style.display = visible ? "block" : "none";
    if (!visible) return;

    els.previewQr.innerHTML = "";
    if (!link || typeof QRCode !== "function") return;

    // eslint-disable-next-line no-new
    new QRCode(els.previewQr, {
      text: link,
      width: 132,
      height: 132,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function updatePreview() {
    const payload = collectPayload();
    const meta = EVENT_META[payload.eventType];
    const template = getCurrentTemplate(payload.eventType);

    els.hostLabel1.textContent = meta.hostLabels[0];
    els.hostLabel2.textContent = meta.hostLabels[1];

    applyTemplateSurface(els.previewHero, template);
    els.previewBadge.textContent = meta.badge;
    els.previewBadge.style.background = `${template.accent}cc`;
    els.previewBadge.style.borderColor = template.accent;

    els.previewTitle.textContent = payload.title;
    const hosts = [payload.hostPrimary, payload.hostSecondary].filter(Boolean).join(" · ");
    els.previewHosts.textContent = hosts || `${meta.hostLabels[0]} 입력`;
    els.previewDate.textContent = formatDateTime(payload.eventDateTime);

    els.previewGreeting.textContent = payload.greeting;
    els.previewVenue.textContent = payload.venueName || "장소를 입력해 주세요";
    els.previewAddress.textContent = payload.address || "주소를 입력해 주세요";
    els.previewContact.textContent = [payload.contactPhone, payload.contactPhone2].filter(Boolean).join(" / ") || "연락처를 입력해 주세요";
    els.previewRsvp.textContent = payload.rsvpDeadline
      ? `${payload.rsvpDeadline}까지 회신 부탁드립니다`
      : "참석 여부를 알려주시면 준비에 큰 도움이 됩니다";

    const links = mapLinksFromPayload(payload);
    els.previewMap.src = links.embed;
    els.routeKakao.href = links.kakao;
    els.routeNaver.href = links.naver;
    els.routeGoogle.href = links.google;

    const primary = payload.mapProvider === "naver" ? links.naver : payload.mapProvider === "google" ? links.google : links.kakao;
    const primaryLabel = payload.mapProvider === "naver" ? "네이버지도로 길찾기" : payload.mapProvider === "google" ? "구글지도로 길찾기" : "카카오맵으로 길찾기";
    els.routePrimary.href = primary;
    els.routePrimary.textContent = primaryLabel;

    els.accountArea.style.display = payload.showAccount ? "block" : "none";
    els.previewAccountSec.style.display = payload.showAccount ? "block" : "none";
    els.previewAccounts.innerHTML = "";

    if (payload.showAccount) {
      if (!payload.accounts.length) {
        const li = document.createElement("li");
        li.textContent = "계좌 정보를 입력하면 이곳에 표시됩니다.";
        els.previewAccounts.appendChild(li);
      } else {
        payload.accounts.forEach((acc) => {
          const li = document.createElement("li");
          li.className = "account-item";

          const left = document.createElement("span");
          left.className = "owner";
          left.textContent = `${acc.bank || "은행"} ${acc.owner || "예금주"}`;

          const right = document.createElement("span");
          right.textContent = acc.number || "계좌번호";

          li.appendChild(left);
          li.appendChild(right);
          els.previewAccounts.appendChild(li);
        });
      }
    }

    renderQr(els.shortUrl.value, payload.showQr);
  }

  function copyToClipboard(text) {
    if (!text) return Promise.reject(new Error("복사할 링크가 없습니다."));
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    return Promise.resolve();
  }

  async function saveInvitation() {
    const payload = collectPayload();

    if (!payload.eventDateTime) {
      setStatus("행사 일시를 입력해 주세요.", "error");
      return;
    }

    if (!payload.title) {
      setStatus("초대장 제목을 입력해 주세요.", "error");
      return;
    }

    try {
      els.saveBtn.disabled = true;
      setStatus("서버에 저장하는 중입니다...");

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "저장 실패");
      }

      els.shortUrl.value = json.shortUrl;
      renderQr(json.shortUrl, payload.showQr);
      setStatus(`저장 완료! 짧은 링크(${json.slug})가 생성되었습니다.`, "ok");
    } catch (error) {
      setStatus(`저장 실패: ${error.message}`, "error");
    } finally {
      els.saveBtn.disabled = false;
    }
  }

  async function copyLink() {
    try {
      await copyToClipboard(els.shortUrl.value);
      setStatus("링크를 복사했습니다.", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function openInvitation() {
    if (!els.shortUrl.value) {
      setStatus("먼저 저장해서 링크를 생성해 주세요.", "error");
      return;
    }
    window.open(els.shortUrl.value, "_blank", "noopener,noreferrer");
  }

  async function fallbackShare(url) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: els.title.value,
          text: "초대장 링크를 확인해 주세요.",
          url,
        });
        setStatus("공유 시트를 열었습니다.", "ok");
        return;
      } catch (_) {
        // pass
      }
    }

    await copyToClipboard(url);
    setStatus("카카오 공유 대신 링크를 복사했습니다.", "ok");
  }

  async function shareKakao() {
    const url = els.shortUrl.value;
    if (!url) {
      setStatus("먼저 저장해서 링크를 생성해 주세요.", "error");
      return;
    }

    const key = els.kakaoJsKey.value.trim();
    if (!key || !window.Kakao) {
      setStatus("카카오 키가 없어서 링크 공유로 대체합니다.");
      await fallbackShare(url);
      return;
    }

    try {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }

      const payload = collectPayload();
      const template = getCurrentTemplate(payload.eventType);
      const shareImagePath = template.image || "/assets/character/party-friends.svg";
      const imageUrl = new URL(shareImagePath, window.location.origin).toString();

      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: payload.title,
          description: `${formatDateTime(payload.eventDateTime)} · ${payload.venueName || payload.address || "행사장"}`,
          imageUrl,
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: "초대장 보기",
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });

      setStatus("카카오톡 공유 창을 열었습니다.", "ok");
    } catch (error) {
      setStatus(`카카오 공유 실패: ${error.message}. 링크 복사로 대체합니다.`);
      await fallbackShare(url);
    }
  }

  function bind() {
    els.eventType.addEventListener("change", () => {
      const next = els.eventType.value;
      const prevMeta = EVENT_META[lastEventType];
      const nextMeta = EVENT_META[next];

      if (!safeText(els.title.value) || safeText(els.title.value) === prevMeta.defaultTitle) {
        els.title.value = nextMeta.defaultTitle;
      }

      if (!safeText(els.greeting.value) || safeText(els.greeting.value) === prevMeta.defaultGreeting) {
        els.greeting.value = nextMeta.defaultGreeting;
      }

      renderTemplateGrid(next);
      updatePreview();
      lastEventType = next;
    });

    const inputs = [
      els.title,
      els.hostPrimary,
      els.hostSecondary,
      els.greeting,
      els.eventDateTime,
      els.rsvpDeadline,
      els.venueName,
      els.address,
      els.contactPhone,
      els.contactPhone2,
      els.mapProvider,
      els.coords,
      els.showAccount,
      els.showQr,
    ];

    inputs.forEach((el) => {
      el.addEventListener("input", updatePreview);
      el.addEventListener("change", updatePreview);
    });

    els.accountRows.forEach((row) => {
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", updatePreview);
      });
    });

    els.saveBtn.addEventListener("click", saveInvitation);
    els.copyBtn.addEventListener("click", copyLink);
    els.openBtn.addEventListener("click", openInvitation);
    els.kakaoBtn.addEventListener("click", shareKakao);
  }

  function setDefaultDate() {
    if (els.eventDateTime.value) return;
    const now = new Date();
    now.setDate(now.getDate() + 14);
    now.setHours(14, 0, 0, 0);

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    els.eventDateTime.value = local;
  }

  function initDefaults() {
    Object.keys(TEMPLATE_LIBRARY).forEach((key) => {
      selectedTemplateByEvent[key] = TEMPLATE_LIBRARY[key][0].id;
    });

    setDefaultDate();

    const eventType = els.eventType.value;
    els.title.value = EVENT_META[eventType].defaultTitle;
    els.greeting.value = EVENT_META[eventType].defaultGreeting;
    lastEventType = eventType;
  }

  function init() {
    initDefaults();
    renderTemplateGrid(els.eventType.value);
    bind();
    updatePreview();
  }

  init();
})();
