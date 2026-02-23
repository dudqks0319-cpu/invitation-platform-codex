(() => {
  const els = {
    adminKey: document.getElementById("adminKey"),
    saveKeyBtn: document.getElementById("saveKeyBtn"),
    loadBtn: document.getElementById("loadBtn"),
    adminStatus: document.getElementById("adminStatus"),
    invitationRows: document.getElementById("invitationRows"),
    selectedTitle: document.getElementById("selectedTitle"),
    rsvpRows: document.getElementById("rsvpRows"),
  };

  let invitations = [];

  function getKey() {
    return els.adminKey.value.trim();
  }

  function setStatus(message, type = "") {
    els.adminStatus.textContent = message || "";
    els.adminStatus.className = `status${type ? ` ${type}` : ""}`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function apiGet(url) {
    const key = getKey();
    if (!key) throw new Error("Admin Key를 먼저 입력해 주세요.");

    const res = await fetch(url, {
      headers: {
        "x-admin-key": key,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "요청 실패");
    }

    return json;
  }

  function renderInvitationRows(items) {
    els.invitationRows.innerHTML = "";

    if (!items.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "등록된 초대장이 없습니다.";
      tr.appendChild(td);
      els.invitationRows.appendChild(tr);
      return;
    }

    items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";

      const link = item.shortUrl || `-`;
      const summary = item.rsvpSummary || { attending: 0, declined: 0, totalGuests: 0 };

      const cells = [
        formatDateTime(item.createdAt),
        item.eventTypeLabel || item.eventType,
        item.title,
        item.slug,
        `${summary.attending} / ${summary.declined}`,
        `${summary.totalGuests}`,
        link,
      ];

      cells.forEach((value, idx) => {
        const td = document.createElement("td");
        if (idx === 6 && value !== "-") {
          const a = document.createElement("a");
          a.href = value;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "열기";
          td.appendChild(a);
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      });

      tr.addEventListener("click", () => {
        loadRsvps(item.id, item.title);
      });

      els.invitationRows.appendChild(tr);
    });
  }

  function renderRsvps(rows) {
    els.rsvpRows.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "아직 RSVP 응답이 없습니다.";
      tr.appendChild(td);
      els.rsvpRows.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const cells = [
        formatDateTime(row.createdAt),
        row.name || "-",
        row.phone || "-",
        row.attending ? "참석" : "불참",
        String(row.guests ?? 0),
        row.message || "-",
      ];

      cells.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      els.rsvpRows.appendChild(tr);
    });
  }

  async function loadInvitations() {
    try {
      setStatus("목록을 불러오는 중입니다...");
      const json = await apiGet("/api/admin/invitations");
      invitations = json.invitations || [];
      renderInvitationRows(invitations);
      renderRsvps([]);
      els.selectedTitle.textContent = "행을 클릭하면 상세를 표시합니다.";
      setStatus(`초대장 ${invitations.length}건을 불러왔습니다.`, "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  async function loadRsvps(invitationId, title) {
    try {
      els.selectedTitle.textContent = `선택: ${title}`;
      const json = await apiGet(`/api/admin/invitations/${encodeURIComponent(invitationId)}/rsvps`);
      renderRsvps(json.rsvps || []);
      setStatus("RSVP 상세를 불러왔습니다.", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function saveKey() {
    const key = getKey();
    if (!key) {
      setStatus("저장할 Admin Key를 입력해 주세요.", "error");
      return;
    }

    localStorage.setItem("inv_admin_key", key);
    setStatus("Admin Key를 브라우저에 저장했습니다.", "ok");
  }

  function loadSavedKey() {
    const saved = localStorage.getItem("inv_admin_key");
    if (saved) {
      els.adminKey.value = saved;
    }
  }

  function bind() {
    els.saveKeyBtn.addEventListener("click", saveKey);
    els.loadBtn.addEventListener("click", loadInvitations);
  }

  loadSavedKey();
  bind();
})();
