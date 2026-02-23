(() => {
  const { EVENT_META, TEMPLATE_LIBRARY } = window.InviteTemplates;

  const els = {
    hero: document.getElementById("hero"),
    badge: document.getElementById("badge"),
    title: document.getElementById("title"),
    hosts: document.getElementById("hosts"),
    eventDate: document.getElementById("eventDate"),
    greeting: document.getElementById("greeting"),

    venue: document.getElementById("venue"),
    address: document.getElementById("address"),
    contacts: document.getElementById("contacts"),
    rsvpDeadline: document.getElementById("rsvpDeadline"),

    mapFrame: document.getElementById("mapFrame"),
    primaryRoute: document.getElementById("primaryRoute"),
    kakaoRoute: document.getElementById("kakaoRoute"),
    naverRoute: document.getElementById("naverRoute"),
    googleRoute: document.getElementById("googleRoute"),

    accountSec: document.getElementById("accountSec"),
    accountList: document.getElementById("accountList"),
    qrSec: document.getElementById("qrSec"),
    qrCode: document.getElementById("qrCode"),

    rsvpForm: document.getElementById("rsvpForm"),
    rsvpName: document.getElementById("rsvpName"),
    rsvpPhone: document.getElementById("rsvpPhone"),
    rsvpGuests: document.getElementById("rsvpGuests"),
    rsvpMessage: document.getElementById("rsvpMessage"),
    rsvpStatus: document.getElementById("rsvpStatus"),
  };

  let invitation = null;

  function setStatus(msg, type = "") {
    els.rsvpStatus.textContent = msg || "";
    els.rsvpStatus.className = `status${type ? ` ${type}` : ""}`;
  }

  function formatDateTime(value) {
    if (!value) return "일시 미정";
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

  function getTemplate(eventType, templateId) {
    const list = TEMPLATE_LIBRARY[eventType] || TEMPLATE_LIBRARY.wedding;
    return list.find((item) => item.id === templateId) || list[0];
  }

  function mapLinks(data) {
    const hasCoords = data.coords && Number.isFinite(data.coords.lat) && Number.isFinite(data.coords.lng);
    const query = hasCoords
      ? `${data.coords.lat},${data.coords.lng}`
      : encodeURIComponent([data.venueName, data.address].filter(Boolean).join(" ") || "서울 시청");

    const kakao = hasCoords
      ? `https://map.kakao.com/link/map/${data.venueName || "행사장"},${data.coords.lat},${data.coords.lng}`
      : `https://map.kakao.com/?q=${query}`;

    const naver = hasCoords
      ? `https://map.naver.com/v5/search/${data.coords.lat},${data.coords.lng}`
      : `https://map.naver.com/v5/search/${query}`;

    const google = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${data.coords.lat},${data.coords.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

    const embed = hasCoords
      ? `https://www.google.com/maps?q=${data.coords.lat},${data.coords.lng}&z=16&output=embed`
      : `https://www.google.com/maps?q=${query}&z=16&output=embed`;

    return { kakao, naver, google, embed };
  }

  function renderQr(show) {
    els.qrSec.style.display = show ? "block" : "none";
    if (!show) return;

    els.qrCode.innerHTML = "";
    if (typeof QRCode !== "function") return;

    // eslint-disable-next-line no-new
    new QRCode(els.qrCode, {
      text: window.location.href,
      width: 132,
      height: 132,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function renderInvitation(data) {
    const meta = EVENT_META[data.eventType] || EVENT_META.wedding;
    const template = getTemplate(data.eventType, data.templateId);

    els.hero.style.backgroundImage = `url('${template.image}')`;
    els.badge.textContent = meta.badge;
    els.badge.style.background = `${template.accent}cc`;
    els.badge.style.borderColor = template.accent;

    els.title.textContent = data.title || meta.defaultTitle;
    const hostText = [data.hostPrimary, data.hostSecondary].filter(Boolean).join(" · ");
    els.hosts.textContent = hostText || `${meta.hostLabels[0]} 입력`;
    els.eventDate.textContent = formatDateTime(data.eventDateTime);
    els.greeting.textContent = data.greeting || meta.defaultGreeting;

    els.venue.textContent = data.venueName || "장소 미정";
    els.address.textContent = data.address || "주소 미정";
    els.contacts.textContent = [data.contactPhone, data.contactPhone2].filter(Boolean).join(" / ") || "연락처 미기재";
    els.rsvpDeadline.textContent = data.rsvpDeadline
      ? `${data.rsvpDeadline}까지 회신 부탁드립니다`
      : "참석 여부를 알려주시면 준비에 도움이 됩니다";

    const links = mapLinks(data);
    els.mapFrame.src = links.embed;
    els.kakaoRoute.href = links.kakao;
    els.naverRoute.href = links.naver;
    els.googleRoute.href = links.google;

    const primary = data.mapProvider === "naver" ? links.naver : data.mapProvider === "google" ? links.google : links.kakao;
    const label = data.mapProvider === "naver" ? "네이버지도로 길찾기" : data.mapProvider === "google" ? "구글지도로 길찾기" : "카카오맵으로 길찾기";
    els.primaryRoute.href = primary;
    els.primaryRoute.textContent = label;

    els.accountSec.style.display = data.showAccount ? "block" : "none";
    els.accountList.innerHTML = "";

    if (data.showAccount) {
      if (!Array.isArray(data.accounts) || !data.accounts.length) {
        const li = document.createElement("li");
        li.textContent = "계좌 정보가 아직 등록되지 않았습니다.";
        els.accountList.appendChild(li);
      } else {
        data.accounts.forEach((acc) => {
          const li = document.createElement("li");
          li.className = "account-item";

          const left = document.createElement("span");
          left.className = "owner";
          left.textContent = `${acc.bank || "은행"} ${acc.owner || "예금주"}`;

          const right = document.createElement("span");
          right.textContent = acc.number || "계좌번호";

          li.appendChild(left);
          li.appendChild(right);
          els.accountList.appendChild(li);
        });
      }
    }

    renderQr(Boolean(data.showQr));

    if (data.rsvpClosed) {
      setStatus("RSVP 마감된 초대장입니다.", "error");
      Array.from(els.rsvpForm.elements).forEach((el) => {
        el.disabled = true;
      });
    }
  }

  function getSlug() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  async function loadInvitation() {
    const slug = getSlug();
    if (!slug) {
      setStatus("잘못된 접근입니다.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "초대장을 찾을 수 없습니다.");
      }

      invitation = json.invitation;
      renderInvitation(invitation);
    } catch (error) {
      setStatus(`초대장 로딩 실패: ${error.message}`, "error");
      els.rsvpForm.style.display = "none";
    }
  }

  async function submitRsvp(event) {
    event.preventDefault();
    if (!invitation) return;

    const attending = els.rsvpForm.querySelector("input[name='attending']:checked")?.value === "yes";
    const payload = {
      name: els.rsvpName.value.trim(),
      phone: els.rsvpPhone.value.trim(),
      attending,
      guests: Number(els.rsvpGuests.value || 0),
      message: els.rsvpMessage.value.trim(),
    };

    if (!payload.name || !payload.phone) {
      setStatus("이름과 연락처를 입력해 주세요.", "error");
      return;
    }

    try {
      setStatus("회신 전송 중입니다...");
      const res = await fetch(`/api/invitations/${encodeURIComponent(invitation.slug)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "회신 실패");
      }

      setStatus("회신이 정상 접수되었습니다. 감사합니다!", "ok");
      els.rsvpForm.reset();
      els.rsvpGuests.value = "1";
      els.rsvpForm.querySelector("input[name='attending'][value='yes']").checked = true;
    } catch (error) {
      setStatus(`회신 실패: ${error.message}`, "error");
    }
  }

  function bind() {
    els.rsvpForm.addEventListener("submit", submitRsvp);
  }

  bind();
  loadInvitation();
})();
